-- Create deadlock_scenarios table for saving and loading scenarios
CREATE TABLE public.deadlock_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  process_count INTEGER NOT NULL,
  resource_count INTEGER NOT NULL,
  processes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deadlock_scenarios ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scenarios" 
ON public.deadlock_scenarios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios" 
ON public.deadlock_scenarios 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios" 
ON public.deadlock_scenarios 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios" 
ON public.deadlock_scenarios 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deadlock_scenarios_updated_at
BEFORE UPDATE ON public.deadlock_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();