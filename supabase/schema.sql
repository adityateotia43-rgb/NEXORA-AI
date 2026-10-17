-- ==============================================================================
-- NEXORA AI — Production Supabase Schema & Row Level Security (RLS) Policies
-- Version: 2.4 (Domain Enforcement: Study, Music, Movies)
-- ==============================================================================
-- Description:
-- Complete PostgreSQL relational schema, triggers, and granular Row Level 
-- Security policies for Nexora AI. Provides multi-tenant data isolation,
-- automatic profile bootstrapping on user registration, and real-time syncing
-- for Study decks, Quiz histories, Cinema watchlists, and Audio soundscapes.
--
-- How to apply:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this entire file and click "Run"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CUSTOM TYPES & ENUMS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.domain_type AS ENUM ('study', 'music', 'movies');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.watchlist_status AS ENUM ('plan', 'watching', 'watched');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.academic_tier AS ENUM ('High School', 'Undergrad', 'Postgrad', 'Doctoral');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.language_preference AS ENUM ('English', 'Hinglish', 'Hindi', 'Spanish', 'French', 'German');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITION
-- ------------------------------------------------------------------------------

-- 3.1 PROFILES TABLE (Linked 1-to-1 with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  academic_tier public.academic_tier DEFAULT 'Undergrad' NOT NULL,
  preferred_language public.language_preference DEFAULT 'Hinglish' NOT NULL,
  xp_points INTEGER DEFAULT 100 CHECK (xp_points >= 0),
  study_streak_days INTEGER DEFAULT 1 CHECK (study_streak_days >= 0),
  bio TEXT DEFAULT 'Scholar exploring STEM, Music Theory, and Cinema Craft.',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.2 CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_client_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'New Conversation',
  domain public.domain_type NOT NULL DEFAULT 'study',
  topic TEXT DEFAULT 'Science',
  tier public.academic_tier DEFAULT 'Undergrad',
  language public.language_preference DEFAULT 'Hinglish',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_session_client_id UNIQUE (user_id, session_client_id)
);

-- 3.3 CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_client_id TEXT NOT NULL DEFAULT '',
  role public.chat_role NOT NULL,
  content TEXT NOT NULL,
  domain public.domain_type NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_message_client_id UNIQUE (user_id, message_client_id)
);

-- 3.4 STUDY FLASHCARDS TABLE (Custom and Bookmarked Active Recall Decks)
CREATE TABLE IF NOT EXISTS public.study_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_client_id TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  tier public.academic_tier DEFAULT 'Undergrad',
  difficulty TEXT DEFAULT 'Medium',
  front_title TEXT NOT NULL,
  front_subtitle TEXT,
  hint TEXT,
  equation TEXT,
  back_answer TEXT NOT NULL,
  is_mastered BOOLEAN DEFAULT FALSE NOT NULL,
  is_bookmarked BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_card_client_id UNIQUE (user_id, card_client_id)
);

-- 3.5 STUDY QUIZ HISTORY TABLE (Adaptive Diagnostic Logs & XP Records)
CREATE TABLE IF NOT EXISTS public.study_quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_client_id TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  tier public.academic_tier DEFAULT 'Undergrad',
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  percentage NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND((score::NUMERIC / total_questions::NUMERIC) * 100, 2)) STORED,
  time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_quiz_client_id UNIQUE (user_id, quiz_client_id)
);

-- 3.6 MOVIE WATCHLIST TABLE (Cinema Pulse Persistent Backlog & Reviews)
CREATE TABLE IF NOT EXISTS public.movie_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  director TEXT,
  rating NUMERIC(3, 1),
  runtime TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[] DEFAULT '{}',
  trailer_key TEXT,
  status public.watchlist_status DEFAULT 'plan' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_movie_entry UNIQUE (user_id, movie_id)
);

-- 3.7 MUSIC SAVED TRACKS TABLE (Music Flow Bookmarks & Acoustic Presets)
CREATE TABLE IF NOT EXISTS public.music_saved_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  bpm INTEGER,
  key_signature TEXT,
  is_favorite BOOLEAN DEFAULT TRUE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_music_track UNIQUE (user_id, track_id)
);

-- 3.8 USER SETTINGS TABLE (App Preferences & UI State)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  audio_synth_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  voice_dictation_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  offline_simulation_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  preferred_provider TEXT DEFAULT 'auto',
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3.9 STUDY NOTES TABLE (Library Vault Saved Syntheses & Study Briefs)
CREATE TABLE IF NOT EXISTS public.study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  tier public.academic_tier DEFAULT 'Undergrad',
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_user_note_client_id UNIQUE (user_id, note_client_id)
);

-- ------------------------------------------------------------------------------
-- 4. HIGH-PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id, domain, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_topic ON public.study_flashcards(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_quiz_history_user ON public.study_quiz_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movie_watchlist_user_status ON public.movie_watchlist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_music_saved_tracks_user ON public.music_saved_tracks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_study_notes_user ON public.study_notes(user_id, topic, updated_at DESC);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC TRIGGERS & STORED PROCEDURES
-- ------------------------------------------------------------------------------

-- 5.1 Updated_At Auto-Updater Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Auto-Bootstrap User Profile upon auth.users Registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  name_meta TEXT;
BEGIN
  -- Extract full_name or name from raw user metadata if provided
  name_meta := NEW.raw_user_meta_data->>'full_name';
  IF name_meta IS NULL OR TRIM(name_meta) = '' THEN
    name_meta := NEW.raw_user_meta_data->>'name';
  END IF;

  -- Fallback to username portion of email if full_name is missing
  IF name_meta IS NOT NULL AND TRIM(name_meta) <> '' THEN
    extracted_name := TRIM(name_meta);
  ELSE
    extracted_name := INITCAP(SPLIT_PART(NEW.email, '@', 1));
  END IF;

  -- Insert default user profile row
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    academic_tier,
    preferred_language,
    xp_points,
    study_streak_days
  ) VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'Undergrad',
    'Hinglish',
    100, -- 100 XP Welcome Bonus
    1
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    updated_at = TIMEZONE('utc'::text, NOW());

  -- Initialize default user settings row
  INSERT INTO public.user_settings (
    user_id,
    theme,
    audio_synth_enabled,
    voice_dictation_enabled,
    offline_simulation_enabled,
    preferred_provider
  ) VALUES (
    NEW.id,
    'dark',
    TRUE,
    TRUE,
    TRUE,
    'auto'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Fire on every new Supabase Auth registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_At Triggers for Stateful Tables
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trigger_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_flashcards_updated_at ON public.study_flashcards;
CREATE TRIGGER trigger_flashcards_updated_at
  BEFORE UPDATE ON public.study_flashcards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_movie_watchlist_updated_at ON public.movie_watchlist;
CREATE TRIGGER trigger_movie_watchlist_updated_at
  BEFORE UPDATE ON public.movie_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_study_notes_updated_at ON public.study_notes;
CREATE TRIGGER trigger_study_notes_updated_at
  BEFORE UPDATE ON public.study_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_music_saved_tracks_updated_at ON public.music_saved_tracks;
CREATE TRIGGER trigger_music_saved_tracks_updated_at
  BEFORE UPDATE ON public.music_saved_tracks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- 6.1 Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_saved_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.2 PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (used as fallback if trigger was delayed)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 6.3 CHAT SESSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "chat_sessions_select_own"
  ON public.chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert_own"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_update_own"
  ON public.chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_delete_own"
  ON public.chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.4 CHAT MESSAGES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_own"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_update_own"
  ON public.chat_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete_own"
  ON public.chat_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.5 STUDY FLASHCARDS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "flashcards_select_own"
  ON public.study_flashcards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "flashcards_insert_own"
  ON public.study_flashcards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_update_own"
  ON public.study_flashcards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "flashcards_delete_own"
  ON public.study_flashcards
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.6 STUDY QUIZ HISTORY POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "quiz_history_select_own"
  ON public.study_quiz_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quiz_history_insert_own"
  ON public.study_quiz_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_history_update_own"
  ON public.study_quiz_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_history_delete_own"
  ON public.study_quiz_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.7 MOVIE WATCHLIST POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "watchlist_select_own"
  ON public.movie_watchlist
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "watchlist_insert_own"
  ON public.movie_watchlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_update_own"
  ON public.movie_watchlist
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_delete_own"
  ON public.movie_watchlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.8 MUSIC SAVED TRACKS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "music_tracks_select_own"
  ON public.music_saved_tracks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "music_tracks_insert_own"
  ON public.music_saved_tracks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_tracks_update_own"
  ON public.music_saved_tracks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_tracks_delete_own"
  ON public.music_saved_tracks
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.9 USER SETTINGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "user_settings_select_own"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_own"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_delete_own"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.10 STUDY NOTES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "notes_select_own"
  ON public.study_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own"
  ON public.study_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own"
  ON public.study_notes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete_own"
  ON public.study_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- END OF SCHEMA & RLS DEFINITION
-- ==============================================================================

