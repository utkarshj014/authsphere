-- Automatically provision the test database alongside the dev database on initial container volume creation
SELECT 'CREATE DATABASE authsphere_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authsphere_test')\gexec
