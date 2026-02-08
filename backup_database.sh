#!/bin/bash
# Database Backup Script for Supabase
# Usage: ./backup_database.sh

# Get current date for backup filenames
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups_${DATE}"
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Supabase Database Backup Script"
echo "=========================================="
echo ""

# Get connection details from user
read -p "Enter Supabase DB Host (e.g., db.xxxxx.supabase.co): " DB_HOST
read -p "Enter Database Password: " -s DB_PASSWORD
echo ""
read -p "Enter Database Name (usually 'postgres'): " DB_NAME
DB_NAME=${DB_NAME:-postgres}

echo ""
echo "Starting backup..."

# Backup 1: Schema only
echo "1. Backing up database schema..."
pg_dump -h "$DB_HOST" \
        -U postgres \
        -d "$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        -F p \
        > "$BACKUP_DIR/schema_${DATE}.sql" 2>&1

if [ $? -eq 0 ]; then
    echo "   ✓ Schema backup complete: $BACKUP_DIR/schema_${DATE}.sql"
else
    echo "   ✗ Schema backup failed"
fi

# Backup 2: Data only (non-sensitive tables)
echo "2. Backing up question data (non-sensitive)..."
pg_dump -h "$DB_HOST" \
        -U postgres \
        -d "$DB_NAME" \
        --data-only \
        --no-owner \
        --no-privileges \
        -t questions \
        -t papers \
        -t conversion_tables \
        -t conversion_rows \
        -F p \
        > "$BACKUP_DIR/questions_data_${DATE}.sql" 2>&1

if [ $? -eq 0 ]; then
    echo "   ✓ Questions data backup complete: $BACKUP_DIR/questions_data_${DATE}.sql"
else
    echo "   ✗ Questions data backup failed"
fi

# Backup 3: AI Generated Questions
echo "3. Backing up AI generated questions..."
pg_dump -h "$DB_HOST" \
        -U postgres \
        -d "$DB_NAME" \
        --data-only \
        --no-owner \
        --no-privileges \
        -t ai_generated_questions \
        -F p \
        > "$BACKUP_DIR/ai_questions_${DATE}.sql" 2>&1

if [ $? -eq 0 ]; then
    echo "   ✓ AI questions backup complete: $BACKUP_DIR/ai_questions_${DATE}.sql"
else
    echo "   ✗ AI questions backup failed"
fi

# Backup 4: All migrations (already in repo, but backup anyway)
echo "4. Copying migrations folder..."
cp -r supabase/migrations "$BACKUP_DIR/migrations" 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ Migrations copied"
else
    echo "   ✗ Migrations copy failed"
fi

echo ""
echo "=========================================="
echo "Backup Summary"
echo "=========================================="
echo "Backup location: $BACKUP_DIR"
echo ""
ls -lh "$BACKUP_DIR"
echo ""
echo "Backup complete!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Do NOT commit backup files to git"
echo "   - Store backups securely (encrypted)"
echo "   - Delete backups after confirming dev environment is set up"
echo ""
