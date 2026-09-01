alter table public.projects
add column description text not null default ''
check (char_length(description) <= 20000);
