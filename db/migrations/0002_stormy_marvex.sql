CREATE TABLE "event_groups" (
	"event_id" text PRIMARY KEY NOT NULL,
	"ballchasing_group_id" text NOT NULL,
	"linked_by" text,
	"confidence" double precision,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_player_stats" (
	"event_id" text NOT NULL,
	"player_id" text NOT NULL,
	"games_played" integer NOT NULL,
	"goals_per_game" double precision,
	"assists_per_game" double precision,
	"saves_per_game" double precision,
	"shots_per_game" double precision,
	"shooting_pct" double precision,
	"save_pct" double precision,
	"demos_per_game" double precision,
	"boost_per_min" double precision,
	"source_group_id" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_player_stats_event_id_player_id_pk" PRIMARY KEY("event_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "event_team_stats" (
	"event_id" text NOT NULL,
	"team_id" text NOT NULL,
	"games_played" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"goals_for" integer,
	"goals_against" integer,
	"source_group_id" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_team_stats_event_id_team_id_pk" PRIMARY KEY("event_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "event_groups" ADD CONSTRAINT "event_groups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_player_stats" ADD CONSTRAINT "event_player_stats_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_player_stats" ADD CONSTRAINT "event_player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_stats" ADD CONSTRAINT "event_team_stats_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_stats" ADD CONSTRAINT "event_team_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_player_stats_player_idx" ON "event_player_stats" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "event_team_stats_team_idx" ON "event_team_stats" USING btree ("team_id");