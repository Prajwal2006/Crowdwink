CREATE TYPE "public"."answer_option" AS ENUM('a', 'b');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('lobby', 'playing', 'finished');--> statement-breakpoint
CREATE TYPE "public"."round_phase" AS ENUM('answering', 'revealed');--> statement-breakpoint
CREATE TYPE "public"."round_winner" AS ENUM('a', 'b', 'tie');--> statement-breakpoint
CREATE TABLE "game_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"room_name" text NOT NULL,
	"rounds_played" integer NOT NULL,
	"winner_names" jsonb NOT NULL,
	"standings" jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"nickname" varchar(24) NOT NULL,
	"nickname_key" varchar(24) NOT NULL,
	"avatar" smallint DEFAULT 0 NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"predicted_count" integer DEFAULT 0 NOT NULL,
	"ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_reason" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"predicted" "answer_option" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_round_id_player_id_pk" PRIMARY KEY("round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(12) NOT NULL,
	"host_player_id" uuid,
	"settings" jsonb NOT NULL,
	"status" "room_status" DEFAULT 'lobby' NOT NULL,
	"game_number" integer DEFAULT 1 NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_results" (
	"round_id" uuid PRIMARY KEY NOT NULL,
	"votes_a" integer NOT NULL,
	"votes_b" integer NOT NULL,
	"winner" "round_winner" NOT NULL,
	"standings" jsonb NOT NULL,
	"finalized_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"game_number" integer NOT NULL,
	"round_number" integer NOT NULL,
	"question_id" varchar(48) NOT NULL,
	"phase" "round_phase" DEFAULT 'answering' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"choice" "answer_option" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_round_id_player_id_pk" PRIMARY KEY("round_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "game_summaries" ADD CONSTRAINT "game_summaries_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_player_id_players_id_fk" FOREIGN KEY ("host_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_results" ADD CONSTRAINT "round_results_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_summaries_room_game_key" ON "game_summaries" USING btree ("room_id","game_number");--> statement-breakpoint
CREATE INDEX "players_room_idx" ON "players" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_room_nickname_active_key" ON "players" USING btree ("room_id","nickname_key") WHERE "players"."removed_at" is null;--> statement-breakpoint
CREATE INDEX "predictions_player_idx" ON "predictions" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "rooms_last_activity_idx" ON "rooms" USING btree ("last_activity_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_room_game_round_key" ON "rounds" USING btree ("room_id","game_number","round_number");--> statement-breakpoint
CREATE INDEX "rounds_room_question_idx" ON "rounds" USING btree ("room_id","question_id");--> statement-breakpoint
CREATE INDEX "votes_player_idx" ON "votes" USING btree ("player_id");