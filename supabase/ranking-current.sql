-- Nutrifruit: current balanced 30-second game. Fresh project installation.
begin;
create schema if not exists nutrifrut_private;
revoke all on schema nutrifrut_private from public,anon,authenticated;
grant usage on schema nutrifrut_private to authenticated;
create table if not exists nutrifrut_private.runs(
 id uuid primary key default gen_random_uuid(),player_id uuid not null references auth.users(id) on delete cascade,
 campaign text not null check(campaign='arma-recarga-v1'),seed integer not null check(seed between 1 and 2147483646),
 started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,nickname text,
 score integer check(score between 0 and 4000 and score%10=0),completed integer,correct_hits integer,events jsonb
);
create index if not exists nr_run_player_time on nutrifrut_private.runs(player_id,started_at desc);
create table if not exists nutrifrut_private.best_scores(
 player_id uuid not null references auth.users(id) on delete cascade,campaign text not null check(campaign='arma-recarga-v1'),
 nickname text not null check(char_length(nickname) between 3 and 18),score integer not null check(score between 0 and 4000 and score%10=0),achieved_at timestamptz not null,
 primary key(campaign,player_id)
);
create unique index if not exists nr_unique_nickname on nutrifrut_private.best_scores(campaign,lower(nickname));
create index if not exists nr_top on nutrifrut_private.best_scores(campaign,score desc,achieved_at,player_id);
alter table nutrifrut_private.runs enable row level security;
alter table nutrifrut_private.best_scores enable row level security;
revoke all on nutrifrut_private.runs,nutrifrut_private.best_scores from public,anon,authenticated;

create or replace function nutrifrut_private.nr_board(p_campaign text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 if p_campaign is distinct from 'arma-recarga-v1' then raise exception 'Campaña inválida.';end if;
 with ranked as(select player_id,nickname,score,row_number() over(order by score desc,achieved_at,player_id) position from nutrifrut_private.best_scores where campaign=p_campaign)
 select jsonb_build_object('entries',coalesce((select jsonb_agg(jsonb_build_object('position',position,'nickname',nickname,'score',score,'is_me',player_id=u) order by position) from ranked where position<=10),'[]'::jsonb),'my_position',(select position from ranked where player_id=u),'best_score',(select score from ranked where player_id=u),'my_nickname',(select nickname from ranked where player_id=u)) into result;
 return result;
end $$;
create or replace function nutrifrut_private.nr_start(p_campaign text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();seed integer;run_id uuid;
begin
 if u is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 if p_campaign is distinct from 'arma-recarga-v1' then raise exception 'Campaña inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if exists(select 1 from nutrifrut_private.runs where player_id=u and started_at>clock_timestamp()-interval '31 seconds') then raise exception 'Espera unos segundos antes de comenzar otra partida.';end if;
 seed:=floor(random()*2147483646)::integer+1;
 insert into nutrifrut_private.runs(player_id,campaign,seed) values(u,p_campaign,seed) returning id into run_id;
 return jsonb_build_object('run_id',run_id,'seed',seed,'duration_ms',30000,'rules_version','balanced-v1','nickname',(select nickname from nutrifrut_private.best_scores where player_id=u and campaign=p_campaign));
end $$;
-- POLÍTICA DE ALIAS: misma normalización y términos que nickname-policy.js.
-- Esta función privada no está expuesta en la API ni recibe permisos del navegador.
create or replace function nutrifrut_private.nr_alias_error(p_name text) returns text
language plpgsql immutable security invoker set search_path='' as $$
declare
 plain text;variant text;compact text;candidate text;word text;phrase text;
 blocked text[]:=array['puta','puto','putas','putos','mierda','mierdas','pendejo','pendeja','pendejos','pendejas','carajo','carajos','cabron','cabrones','cojudo','cojuda','cojudos','cojudas','verga','vergas','culero','culera','maricon','maricones','concha','fuck','fucker','shit','bitch','nazi','hitler','troll','admin','administrador','moderador','nutrifruit','nutrifrut'];phrases text[]:=array['hijodeputa','hijadeputa','putamadre','chupapija','chupaverga','heilhitler'];
begin
 if p_name is null or p_name !~ '^[A-Za-zÁÉÍÓÚáéíóúÑñÜü][A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü_]{2,11}$' then
  return 'Usa de 3 a 12 caracteres. Empieza con una letra; añade letras, números o guion bajo.';
 end if;
 plain:=translate(lower(p_name),'áéíóúüñ','aeiouun');
 foreach variant in array array[plain,translate(plain,'013457','oieast')] loop
  compact:=replace(variant,'_','');
  foreach candidate in array array_append(string_to_array(variant,'_'),compact) loop
   foreach word in array array[candidate,regexp_replace(candidate,'([a-z])\1+','\1','g')] loop
    if regexp_replace(word,'[0-9]+$','')=any(blocked) then
     return 'Ese nombre no está permitido. Elige un alias respetuoso y personal.';
    end if;
   end loop;
  end loop;
  foreach phrase in array phrases loop
   if position(phrase in compact)>0 then return 'Ese nombre no está permitido. Elige un alias respetuoso y personal.';end if;
  end loop;
 end loop;
 return null;
end;$$;
revoke all on function nutrifrut_private.nr_alias_error(text) from public,anon,authenticated;

create or replace function nutrifrut_private.nr_finish(p_run_id uuid,p_nickname text,p_hits jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();r nutrifrut_private.runs%rowtype;alias text:=btrim(p_nickname);registered_alias text;alias_error text;now_at timestamptz:=clock_timestamp();
 rng bigint;i integer;j integer;spawns integer[]:='{}';lifetimes integer[]:='{}';types integer[]:='{}';
 e jsonb;id integer;t integer;last_hit integer:=-1000;seen integer[]:='{}';
 points integer:=0;combos integer:=0;correct integer:=0;streak integer:=0;multiplier integer:=1;needed integer[]:=array[2,1,1];filled integer[]:=array[0,0,0];kind integer;
 speed double precision:=1;target double precision:=1;new_target double precision;travel double precision:=0;clock_at integer:=0;delta integer;decay double precision;birth double precision;
 times integer[]:=array[0];travels double precision[]:=array[0::double precision];speeds double precision[]:=array[1::double precision];targets double precision[]:=array[1::double precision];segment integer;
begin
 if u is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into r from nutrifrut_private.runs where runs.id=p_run_id and player_id=u for update;
 if not found then raise exception 'Partida inválida.';end if;
 if r.finished_at is not null then return nutrifrut_private.nr_board(r.campaign)||jsonb_build_object('score',r.score,'saved',true);end if;
 -- Conserva los nombres ya registrados; valida todos los alias nuevos en el servidor.
 select nickname into registered_alias from nutrifrut_private.best_scores where player_id=u and campaign=r.campaign;
 if registered_alias is not null then alias:=registered_alias;
 else
  alias_error:=nutrifrut_private.nr_alias_error(alias);
  if alias_error is not null then raise exception '%',alias_error;end if;
 end if;
 if now_at<r.started_at+interval '30 seconds' then raise exception 'La partida todavía no terminó.';end if;
 if now_at>r.started_at+interval '30 minutes' then raise exception 'La partida venció. Juega de nuevo.';end if;
 if p_hits is null or jsonb_typeof(p_hits)<>'array' then raise exception 'Eventos inválidos.';end if;
 if jsonb_array_length(p_hits)>77 then raise exception 'Demasiados ingredientes.';end if;
 -- Seven random numbers per ingredient, identical to balanced-rules.js.
 rng:=r.seed;
 for i in 0..76 loop
  rng:=(rng*48271)%2147483647;spawns:=array_append(spawns,300+i*380+floor(rng::numeric/2147483647*151)::integer-75);
  rng:=(rng*48271)%2147483647;lifetimes:=array_append(lifetimes,3600+floor(rng::numeric/2147483647*501)::integer);
  rng:=(rng*48271)%2147483647;types:=array_append(types,floor(rng::numeric/2147483647*3)::integer);
  for j in 1..4 loop rng:=(rng*48271)%2147483647;end loop;
 end loop;
 for e in select value from jsonb_array_elements(p_hits) loop
  if jsonb_typeof(e)<>'object' or jsonb_typeof(e->'id') is distinct from 'number' or jsonb_typeof(e->'t') is distinct from 'number' or (e->>'id') !~ '^[0-9]{1,2}$' or (e->>'t') !~ '^[0-9]{1,5}$' then raise exception 'Evento inválido.';end if;
  id:=(e->>'id')::integer;t:=(e->>'t')::integer;
  if id<0 or id>76 or id=any(seen) or t<spawns[id+1]+80 or t>=30000 or t<last_hit+75 then raise exception 'Puntuación inválida.';end if;
  -- Exact integral of the speed transition, independent of frame rate.
  delta:=t-clock_at;decay:=exp(-delta::double precision/650);
  travel:=travel+target*delta+(speed-target)*650*(1-decay);speed:=target+(speed-target)*decay;clock_at:=t;
  segment:=1;for j in 1..array_length(times,1) loop if times[j]<=spawns[id+1] then segment:=j;else exit;end if;end loop;
  delta:=spawns[id+1]-times[segment];decay:=exp(-delta::double precision/650);
  birth:=travels[segment]+targets[segment]*delta+(speeds[segment]-targets[segment])*650*(1-decay);
  if travel-birth>lifetimes[id+1]+.01 then raise exception 'Ingrediente vencido.';end if;
  seen:=array_append(seen,id);last_hit:=t;kind:=types[id+1]+1;
  if filled[kind]>=needed[kind] then streak:=0;multiplier:=1;
  else
   filled[kind]:=filled[kind]+1;correct:=correct+1;points:=points+10*multiplier;
   if filled[1]>=needed[1] and filled[2]>=needed[2] and filled[3]>=needed[3] then
    points:=points+30*multiplier;combos:=combos+1;streak:=streak+1;multiplier:=least(3,1+streak/3);
    needed:=case combos%4 when 0 then array[2,1,1] when 1 then array[1,2,1] when 2 then array[1,1,2] else array[2,2,0] end;
    if combos>=3 then kind:=combos%3+1;needed[kind]:=needed[kind]+1;end if;
    filled:=array[0,0,0];
   end if;
  end if;
  new_target:=case when points>=800 then 2.05 when points>=520 then 1.85 when points>=320 then 1.65 when points>=180 then 1.4 when points>=80 then 1.2 else 1 end;
  if new_target<>target then target:=new_target;times:=array_append(times,t);travels:=array_append(travels,travel);speeds:=array_append(speeds,speed);targets:=array_append(targets,target);end if;
 end loop;
 update nutrifrut_private.runs set finished_at=now_at,nickname=alias,score=points,completed=combos,correct_hits=correct,events=p_hits where runs.id=p_run_id;
 begin
  insert into nutrifrut_private.best_scores(player_id,campaign,nickname,score,achieved_at) values(u,r.campaign,alias,points,now_at)
  on conflict(campaign,player_id) do update set score=excluded.score,achieved_at=excluded.achieved_at where excluded.score>nutrifrut_private.best_scores.score;
 exception when unique_violation then raise exception 'Ese nombre ya está en uso. Elige otro.';
 end;
 return nutrifrut_private.nr_board(r.campaign)||jsonb_build_object('score',points,'completed',combos,'correct_hits',correct,'saved',true);
end $$;
create or replace function public.nr_start_run(p_campaign text default 'arma-recarga-v1') returns jsonb language sql security invoker set search_path='' as $$select nutrifrut_private.nr_start(p_campaign);$$;
create or replace function public.nr_finish_run(p_run_id uuid,p_nickname text,p_hits jsonb) returns jsonb language sql security invoker set search_path='' as $$select nutrifrut_private.nr_finish(p_run_id,p_nickname,p_hits);$$;
create or replace function public.nr_leaderboard(p_campaign text default 'arma-recarga-v1') returns jsonb language sql security invoker set search_path='' as $$select nutrifrut_private.nr_board(p_campaign);$$;
revoke all on function nutrifrut_private.nr_start(text),nutrifrut_private.nr_finish(uuid,text,jsonb),nutrifrut_private.nr_board(text) from public,anon,authenticated;
grant execute on function nutrifrut_private.nr_start(text),nutrifrut_private.nr_finish(uuid,text,jsonb),nutrifrut_private.nr_board(text) to authenticated;
revoke all on function public.nr_start_run(text),public.nr_finish_run(uuid,text,jsonb),public.nr_leaderboard(text) from public,anon,authenticated;
grant execute on function public.nr_start_run(text),public.nr_finish_run(uuid,text,jsonb),public.nr_leaderboard(text) to authenticated;
notify pgrst,'reload schema';
commit;
