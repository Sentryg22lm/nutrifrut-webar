-- Ejecutado en el proyecto actual. Conserva partidas anteriores y mejores marcas.
begin;
alter table nutrifrut_private.runs add column if not exists rules_version text not null default 'balanced-v1' check(rules_version in ('balanced-v1','balanced-v2'));
-- Progresión temporal: misma integral que balanced-rules.js
create or replace function nutrifrut_private.nr_travel_v2(p_speed double precision,p_base double precision,p_from integer,p_to integer)
returns jsonb language plpgsql immutable security invoker set search_path='' as $timing$
declare at_ms integer:=greatest(0,p_from);end_ms integer:=greatest(at_ms,p_to);until_ms integer;
 current_speed double precision:=p_speed;distance double precision:=0;factor double precision;target double precision;delta integer;decay double precision;
begin
 while at_ms<end_ms loop
  factor:=case when at_ms>=27000 then 1.15 when at_ms>=25000 then 1.12 when at_ms>=20000 then 1.08 when at_ms>=14000 then 1.05 when at_ms>=8000 then 1.025 else 1 end;
  until_ms:=least(end_ms,case when at_ms<8000 then 8000 when at_ms<14000 then 14000 when at_ms<20000 then 20000 when at_ms<25000 then 25000 when at_ms<27000 then 27000 else end_ms end);
  target:=p_base*factor;delta:=until_ms-at_ms;decay:=exp(-delta::double precision/650);
  distance:=distance+target*delta+(current_speed-target)*650*(1-decay);
  current_speed:=target+(current_speed-target)*decay;at_ms:=until_ms;
 end loop;
 return jsonb_build_object('speed',current_speed,'distance',distance);
end $timing$;
revoke all on function nutrifrut_private.nr_travel_v2(double precision,double precision,integer,integer) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION nutrifrut_private.nr_start(p_campaign text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();seed integer;run_id uuid;
begin
 if u is null then raise exception 'Se requiere una sesión.' using errcode='42501';end if;
 if p_campaign is distinct from 'arma-recarga-v1' then raise exception 'Campaña inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if exists(select 1 from nutrifrut_private.runs where player_id=u and started_at>clock_timestamp()-interval '31 seconds') then raise exception 'Espera unos segundos antes de comenzar otra partida.';end if;
 seed:=floor(random()*2147483646)::integer+1;
 insert into nutrifrut_private.runs(player_id,campaign,seed,rules_version) values(u,p_campaign,seed,'balanced-v2') returning id into run_id;
 return jsonb_build_object('run_id',run_id,'seed',seed,'duration_ms',30000,'rules_version','balanced-v2','nickname',(select nickname from nutrifrut_private.best_scores where player_id=u and campaign=p_campaign));
end $function$
;
CREATE OR REPLACE FUNCTION nutrifrut_private.nr_finish(p_run_id uuid, p_nickname text, p_hits jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=auth.uid();r nutrifrut_private.runs%rowtype;alias text:=btrim(p_nickname);registered_alias text;alias_error text;now_at timestamptz:=clock_timestamp();
 rng bigint;i integer;j integer;spawns integer[]:='{}';lifetimes integer[]:='{}';types integer[]:='{}';
 e jsonb;id integer;t integer;last_hit integer:=-1000;seen integer[]:='{}';
 points integer:=0;combos integer:=0;correct integer:=0;streak integer:=0;multiplier integer:=1;needed integer[]:=array[2,1,1];filled integer[]:=array[0,0,0];kind integer;
 speed double precision:=1;target double precision:=1;new_target double precision;travel double precision:=0;clock_at integer:=0;delta integer;decay double precision;birth double precision;
 times integer[]:=array[0];travels double precision[]:=array[0::double precision];speeds double precision[]:=array[1::double precision];targets double precision[]:=array[1::double precision];segment integer;step jsonb;
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
  if r.rules_version='balanced-v2' then
   step:=nutrifrut_private.nr_travel_v2(speed,target,clock_at,t);
   travel:=travel+(step->>'distance')::double precision;speed:=(step->>'speed')::double precision;
  else
   delta:=t-clock_at;decay:=exp(-delta::double precision/650);
   travel:=travel+target*delta+(speed-target)*650*(1-decay);speed:=target+(speed-target)*decay;
  end if;clock_at:=t;
  segment:=1;for j in 1..array_length(times,1) loop if times[j]<=spawns[id+1] then segment:=j;else exit;end if;end loop;
  if r.rules_version='balanced-v2' then
   step:=nutrifrut_private.nr_travel_v2(speeds[segment],targets[segment],times[segment],spawns[id+1]);
   birth:=travels[segment]+(step->>'distance')::double precision;
  else
   delta:=spawns[id+1]-times[segment];decay:=exp(-delta::double precision/650);
   birth:=travels[segment]+targets[segment]*delta+(speeds[segment]-targets[segment])*650*(1-decay);
  end if;
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
end $function$
;
notify pgrst,'reload schema';
commit;

