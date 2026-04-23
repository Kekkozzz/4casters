-- Enable pgvector extension (no-op if already enabled on Supabase).
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"speaker_id" text NOT NULL,
	"text" text NOT NULL,
	"source_url" text NOT NULL,
	"source_type" text NOT NULL,
	"source_timestamp" timestamp with time zone,
	"content_hash" text NOT NULL,
	"embedding" vector(768),
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_speaker_id_players_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotes_speaker_idx" ON "quotes" USING btree ("speaker_id");--> statement-breakpoint
CREATE INDEX "quotes_source_type_idx" ON "quotes" USING btree ("source_type");--> statement-breakpoint
-- ivfflat similarity index. lists=100 is a reasonable default for < 1M rows;
-- retune when quote corpus grows past that.
CREATE INDEX "quotes_embedding_idx" ON "quotes"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
