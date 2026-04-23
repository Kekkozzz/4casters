CREATE TABLE "generated_sheets" (
	"match_id" text PRIMARY KEY NOT NULL,
	"output" jsonb NOT NULL,
	"packet" jsonb NOT NULL,
	"violations" jsonb NOT NULL,
	"retried" boolean NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"tokens_input" integer NOT NULL,
	"tokens_output" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_sheets" ADD CONSTRAINT "generated_sheets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;