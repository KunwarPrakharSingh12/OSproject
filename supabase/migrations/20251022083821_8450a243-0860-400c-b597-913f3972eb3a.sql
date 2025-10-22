-- Allow authenticated users to delete components
CREATE POLICY "Authenticated users can delete components"
ON public.components
FOR DELETE
USING (auth.uid() IS NOT NULL);