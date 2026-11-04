-- Let the Data API (PostgREST) serve the student_portal schema alongside the ones the HR Suite already
-- uses. Before this the exposed list was exactly "public, graphql_public"; keep those first.
-- Equivalent dashboard setting: Project Settings -> Data API -> Exposed schemas (add student_portal there
-- too so the dashboard shows the same list).
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, student_portal';
NOTIFY pgrst, 'reload config';
