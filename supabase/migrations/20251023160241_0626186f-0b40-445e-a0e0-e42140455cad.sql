-- Fix 1: Restrict profile email exposure to owner only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Fix 2: Components require board ownership verification
DROP POLICY IF EXISTS "Authenticated users can create components" ON public.components;
DROP POLICY IF EXISTS "Authenticated users can update components" ON public.components;
DROP POLICY IF EXISTS "Authenticated users can delete components" ON public.components;

CREATE POLICY "Board owners can create components"
ON public.components FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = components.board_id
    AND boards.owner_id = auth.uid()
  )
);

CREATE POLICY "Board owners can update components"
ON public.components FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = components.board_id
    AND boards.owner_id = auth.uid()
  )
);

CREATE POLICY "Board owners can delete components"
ON public.components FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = components.board_id
    AND boards.owner_id = auth.uid()
  )
);

-- Fix 3: Restrict deadlock detections to board owners
DROP POLICY IF EXISTS "Deadlock detections are viewable by everyone" ON public.deadlock_detections;

CREATE POLICY "Board owners can view deadlock detections"
ON public.deadlock_detections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.boards
    WHERE boards.id = deadlock_detections.board_id
    AND boards.owner_id = auth.uid()
  )
);

-- Fix 4: Resource locks require board ownership verification
DROP POLICY IF EXISTS "Users can request locks" ON public.resource_locks;
DROP POLICY IF EXISTS "Users can update own locks" ON public.resource_locks;
DROP POLICY IF EXISTS "Users can delete own locks" ON public.resource_locks;

CREATE POLICY "Users can create locks on accessible boards"
ON public.resource_locks FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.components c
    JOIN public.boards b ON b.id = c.board_id
    WHERE c.id = resource_locks.component_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update locks on accessible boards"
ON public.resource_locks FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.components c
    JOIN public.boards b ON b.id = c.board_id
    WHERE c.id = resource_locks.component_id
    AND b.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete locks on accessible boards"
ON public.resource_locks FOR DELETE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.components c
    JOIN public.boards b ON b.id = c.board_id
    WHERE c.id = resource_locks.component_id
    AND b.owner_id = auth.uid()
  )
);

-- Fix 5: Add input validation constraints
ALTER TABLE public.components 
ADD CONSTRAINT title_length_check CHECK (char_length(title) > 0 AND char_length(title) <= 200);

ALTER TABLE public.components
ADD CONSTRAINT content_length_check CHECK (content IS NULL OR char_length(content) <= 5000);