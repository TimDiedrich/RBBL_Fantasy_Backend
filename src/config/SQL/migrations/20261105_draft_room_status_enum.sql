BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'draft_room_status'
    ) THEN
        CREATE TYPE draft_room_status AS ENUM (
            'NOT_STARTED',
            'SCHEDULED',
            'PAUSED',
            'IN_PROGRESS',
            'COMPLETED'
        );
    END IF;
END
$$;

ALTER TABLE draft_rooms
    ALTER COLUMN status DROP DEFAULT;

ALTER TABLE draft_rooms
    ALTER COLUMN status TYPE draft_room_status
    USING status::text::draft_room_status;

ALTER TABLE draft_rooms
    ALTER COLUMN status SET DEFAULT 'NOT_STARTED';

COMMIT;