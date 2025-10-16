-- Create enum for component types
CREATE TYPE public.component_type AS ENUM ('card', 'section', 'document', 'cell');

-- Create enum for lock status
CREATE TYPE public.lock_status AS ENUM ('locked', 'waiting', 'released');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create boards table
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Boards are viewable by everyone"
  ON public.boards FOR SELECT
  USING (true);

CREATE POLICY "Users can create boards"
  ON public.boards FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Board owners can update"
  ON public.boards FOR UPDATE
  USING (auth.uid() = owner_id);

-- Create components table (lockable resources)
CREATE TABLE public.components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  component_type component_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Components are viewable by everyone"
  ON public.components FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create components"
  ON public.components FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update components"
  ON public.components FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create resource locks table
CREATE TABLE public.resource_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status lock_status NOT NULL DEFAULT 'waiting',
  acquired_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  UNIQUE(component_id, user_id)
);

ALTER TABLE public.resource_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locks are viewable by everyone"
  ON public.resource_locks FOR SELECT
  USING (true);

CREATE POLICY "Users can request locks"
  ON public.resource_locks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locks"
  ON public.resource_locks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own locks"
  ON public.resource_locks FOR DELETE
  USING (auth.uid() = user_id);

-- Create deadlock detection results table
CREATE TABLE public.deadlock_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycles JSONB NOT NULL,
  conflicting_users JSONB NOT NULL,
  conflicting_components JSONB NOT NULL,
  recommended_actions JSONB NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.deadlock_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deadlock detections are viewable by everyone"
  ON public.deadlock_detections FOR SELECT
  USING (true);

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_components_updated_at
  BEFORE UPDATE ON public.components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile automatically on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.components;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deadlock_detections;