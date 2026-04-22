CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text,
	"region" text,
	"start_date" date,
	"end_date" date,
	"liquipedia_url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"team_a_id" text NOT NULL,
	"team_b_id" text NOT NULL,
	"scheduled_at" timestamp with time zone,
	"stage" text,
	"format" text,
	"score_a" integer,
	"score_b" integer,
	"liquipedia_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"nationality" text,
	"current_team_id" text,
	"liquipedia_url" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster_history" (
	"player_id" text NOT NULL,
	"team_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"role" text,
	"source_url" text NOT NULL,
	CONSTRAINT "roster_history_player_id_team_id_start_date_pk" PRIMARY KEY("player_id","team_id","start_date")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text,
	"region" text,
	"liquipedia_url" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_history" ADD CONSTRAINT "roster_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_history" ADD CONSTRAINT "roster_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_event_idx" ON "matches" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "matches_scheduled_idx" ON "matches" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "players_current_team_idx" ON "players" USING btree ("current_team_id");--> statement-breakpoint
CREATE INDEX "roster_history_team_idx" ON "roster_history" USING btree ("team_id");