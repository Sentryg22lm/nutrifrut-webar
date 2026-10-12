-- Nutrifrut: ejecutar este archivo completo una vez en el SQL Editor.
-- Las tablas privadas no se exponen a la API. El navegador utiliza tres RPC.
-- Activar también Authentication > Anonymous Sign-Ins en el proyecto.
begin;
create schema if not exists nutrifrut_private;
revoke all on schema nutrifrut_private from public, anon, authenticated;
grant usage on schema nutrifrut_private to authenticated;

create table if not exists nutrifrut_private.runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null check(campaign in ('recargate-v1','recargate-v2')),
  seed integer not null check(seed between 1 and 2147483646),
  started_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  nickname text,
  score integer check(score between 0 and 990 and score % 10 = 0)
);
create index if not exists nf_runs_player_time_idx on nutrifrut_private.runs(player_id,started_at desc);
create table if not exists nutrifrut_private.best_scores (
  player_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null check(campaign in ('recargate-v1','recargate-v2')),
  nickname text not null check(char_length(nickname) between 3 and 18),
  score integer not null check(score between 0 and 990 and score % 10=0),
  achieved_at timestamptz not null,
  primary key(campaign,player_id)
);
create index if not exists nf_best_rank_idx on nutrifrut_private.best_scores(campaign,score desc,achieved_at,player_id);
alter table nutrifrut_private.runs enable row level security;
alter table nutrifrut_private.best_scores enable row level security;
revoke all on nutrifrut_private.runs,nutrifrut_private.best_scores from public,anon,authenticated;
-- Sin políticas de lectura/escritura directa: solo las funciones autorizadas.

create or replace function nutrifrut_private.leaderboard(p_campaign text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then raise exception 'Se requiere una sesión.' using errcode='42501'; end if;
  if p_campaign is null or p_campaign not in ('recargate-v1','recargate-v2') then raise exception 'Campaña inválida.'; end if;
  with ranked as (
    select player_id,nickname,score,row_number() over(order by score desc,achieved_at,player_id) as position
    from nutrifrut_private.best_scores where campaign=p_campaign
  )
  select jsonb_build_object(
    'entries',coalesce((select jsonb_agg(jsonb_build_object('position',position,'nickname',nickname,'score',score,'is_me',player_id=v_uid) order by position) from ranked where position<=10),'[]'::jsonb),
    'my_position',(select position from ranked where player_id=v_uid),
    'best_score',(select score from ranked where player_id=v_uid),
    'my_nickname',(select nickname from ranked where player_id=v_uid)
  ) into v_result;
  return v_result;
end; $$;

create or replace function nutrifrut_private.start_run(p_campaign text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid := auth.uid(); v_seed integer; v_id uuid;
begin
  if v_uid is null then raise exception 'Se requiere una sesión.' using errcode='42501'; end if;
  if p_campaign is null or p_campaign not in ('recargate-v1','recargate-v2') then raise exception 'Campaña inválida.'; end if;
  -- Serializa los comienzos de un mismo jugador para impedir carreras.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  if exists(select 1 from nutrifrut_private.runs where player_id=v_uid and started_at>clock_timestamp()-case when p_campaign='recargate-v2' then interval '31 seconds' else interval '16 seconds' end) then
    raise exception 'Espera unos segundos antes de comenzar otra partida.';
  end if;
  v_seed:=floor(random()*2147483646)::integer+1;
  insert into nutrifrut_private.runs(player_id,campaign,seed) values(v_uid,p_campaign,v_seed) returning id into v_id;
  return jsonb_build_object('run_id',v_id,'seed',v_seed,'duration_ms',case when p_campaign='recargate-v2' then 30000 else 15000 end,
    'nickname',(select nickname from nutrifrut_private.best_scores where player_id=v_uid and campaign=p_campaign));
end; $$;

create or replace function nutrifrut_private.finish_run(p_run_id uuid,p_nickname text,p_hits jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid(); v_run nutrifrut_private.runs%rowtype; v_alias text:=btrim(p_nickname);
 v_hit jsonb; v_id integer; v_time integer; v_previous integer:=-1000; v_seen integer[]:='{}'; v_spawn integer; v_score integer:=0; v_now timestamptz:=clock_timestamp();
 v_rng bigint; v_index integer; v_skip integer; v_spawns integer[]:='{}'; v_lifetimes integer[]:='{}'; v_duration integer; v_count integer; v_interval integer; v_life_min integer; v_life_range integer;
begin
 if v_uid is null then raise exception 'Se requiere una sesión.' using errcode='42501'; end if;
 -- El mismo bloqueo serializa partidas simultáneas y la elección inicial del alias.
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 select * into v_run from nutrifrut_private.runs where id=p_run_id and player_id=v_uid for update;
 if not found then raise exception 'Partida inválida.'; end if;
 -- La respuesta es idempotente: un reintento no agrega otra puntuación.
 if v_run.finished_at is not null then return nutrifrut_private.leaderboard(v_run.campaign)||jsonb_build_object('score',v_run.score,'saved',true); end if;
 -- El alias se fija en el primer resultado guardado. Ignorar cambios del cliente.
 select coalesce((select nickname from nutrifrut_private.best_scores where player_id=v_uid and campaign=v_run.campaign),v_alias) into v_alias;
 if v_alias is null or v_alias !~ '^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü _.-]{3,18}$' then raise exception 'Usa un alias de 3 a 18 caracteres.'; end if;
 v_duration:=case when v_run.campaign='recargate-v2' then 30000 else 15000 end;
 v_count:=case when v_run.campaign='recargate-v2' then 99 else 37 end;
 v_interval:=case when v_run.campaign='recargate-v2' then 300 else 400 end;
 v_life_min:=case when v_run.campaign='recargate-v2' then 2600 else 1400 end;
 v_life_range:=case when v_run.campaign='recargate-v2' then 1201 else 801 end;
 if v_now<v_run.started_at+v_duration*interval '1 millisecond' then raise exception 'La partida todavía no terminó.'; end if;
 if v_now>v_run.started_at+interval '30 minutes' then raise exception 'La partida venció. Juega de nuevo.'; end if;
 if p_hits is null or jsonb_typeof(p_hits)!='array' then raise exception 'Eventos inválidos.'; end if;
 if jsonb_array_length(p_hits)>v_count then raise exception 'Demasiados ingredientes.'; end if;
 -- Mismo generador y ocho pasos por ingrediente que game-rules.js.
 -- El reloj de eventos cuenta solo los segundos de juego activo de cada versión.
 v_rng:=v_run.seed;
 for v_index in 0..(v_count-1) loop
   v_rng:=(v_rng*48271)%2147483647;
   v_spawns:=array_append(v_spawns,300+v_index*v_interval+floor(v_rng::numeric/2147483647*241)::integer-120);
   v_rng:=(v_rng*48271)%2147483647;
   v_lifetimes:=array_append(v_lifetimes,v_life_min+floor(v_rng::numeric/2147483647*v_life_range)::integer);
   for v_skip in 1..6 loop v_rng:=(v_rng*48271)%2147483647; end loop;
 end loop;
 for v_hit in select value from jsonb_array_elements(p_hits) loop
   if jsonb_typeof(v_hit)!='object' or jsonb_typeof(v_hit->'id') is distinct from 'number' or jsonb_typeof(v_hit->'t') is distinct from 'number'
      or (v_hit->>'id') !~ '^[0-9]{1,2}$' or (v_hit->>'t') !~ '^[0-9]{1,5}$' then raise exception 'Evento inválido.'; end if;
   v_id:=(v_hit->>'id')::integer; v_time:=(v_hit->>'t')::integer;
   if v_id<0 or v_id>=v_count then raise exception 'Puntuación inválida.'; end if;
   v_spawn:=v_spawns[v_id+1];
   if v_id=any(v_seen) or v_time<v_spawn+80 or v_time>v_spawn+v_lifetimes[v_id+1] or v_time>=v_duration or v_time<v_previous+75 then
      raise exception 'Puntuación inválida.';
   end if;
   v_seen:=array_append(v_seen,v_id); v_previous:=v_time; v_score:=v_score+10;
 end loop;
 update nutrifrut_private.runs set finished_at=v_now,nickname=v_alias,score=v_score where id=p_run_id;
 insert into nutrifrut_private.best_scores(player_id,campaign,nickname,score,achieved_at)
 values(v_uid,v_run.campaign,v_alias,v_score,v_now)
 on conflict(campaign,player_id) do update
 set score=excluded.score,achieved_at=excluded.achieved_at
 where excluded.score>nutrifrut_private.best_scores.score;
 return nutrifrut_private.leaderboard(v_run.campaign)||jsonb_build_object('score',v_score,'saved',true);
end; $$;

-- API pública: invoker. Las operaciones privilegiadas viven en el esquema privado,
-- verifican auth.uid() y no conceden acceso a las tablas al navegador.
create or replace function public.nf_start_run(p_campaign text default 'recargate-v1') returns jsonb
language sql security invoker set search_path='' as $$ select nutrifrut_private.start_run(p_campaign); $$;
create or replace function public.nf_finish_run(p_run_id uuid,p_nickname text,p_hits jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select nutrifrut_private.finish_run(p_run_id,p_nickname,p_hits); $$;
create or replace function public.nf_leaderboard(p_campaign text default 'recargate-v1') returns jsonb
language sql security invoker set search_path='' as $$ select nutrifrut_private.leaderboard(p_campaign); $$;

revoke all on function nutrifrut_private.start_run(text),nutrifrut_private.finish_run(uuid,text,jsonb),nutrifrut_private.leaderboard(text) from public,anon,authenticated;
grant execute on function nutrifrut_private.start_run(text),nutrifrut_private.finish_run(uuid,text,jsonb),nutrifrut_private.leaderboard(text) to authenticated;
revoke all on function public.nf_start_run(text),public.nf_finish_run(uuid,text,jsonb),public.nf_leaderboard(text) from public,anon,authenticated;
grant execute on function public.nf_start_run(text),public.nf_finish_run(uuid,text,jsonb),public.nf_leaderboard(text) to authenticated;
notify pgrst,'reload schema';
commit;
