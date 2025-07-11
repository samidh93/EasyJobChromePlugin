#!/bin/bash

# EasyJob Database Management Script
# Manages PostgreSQL database with Docker containers

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
DOCKER_DIR="$PROJECT_ROOT/docker"

echo "🚀 EasyJob Database Management Script"
echo "======================================"

case "${1:-help}" in
    "start")
        echo "Starting EasyJob database..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose-db.yml up -d
        
        echo "⏳ Waiting for database to be ready..."
        sleep 5
        
        # Wait for PostgreSQL to be ready
        echo "🔍 Checking database health..."
        timeout=30
        while [ $timeout -gt 0 ]; do
            if docker exec easyjob-postgres pg_isready -U easyjob_user -d easyjob_db >/dev/null 2>&1; then
                echo "✅ Database is ready!"
                break
            fi
            echo "⏳ Waiting for database... ($timeout seconds left)"
            sleep 1
            timeout=$((timeout - 1))
        done
        
        if [ $timeout -eq 0 ]; then
            echo "❌ Database failed to start within 30 seconds"
            exit 1
        fi
        
        echo ""
        echo "🎉 EasyJob database started successfully!"
        echo "📊 PostgreSQL: localhost:5432"
        echo "   Database: easyjob_db"
        echo "   User: easyjob_user"
        echo "   Password: easyjob_password"
        echo ""
        echo "🔧 pgAdmin: http://localhost:8080"
        echo "   Email: admin@example.com"
        echo "   Password: admin123"
        echo ""
        echo "📝 To connect pgAdmin to PostgreSQL:"
        echo "   Host: postgres (or host.docker.internal on Mac/Windows)"
        echo "   Port: 5432"
        echo "   Database: easyjob_db"
        echo "   Username: easyjob_user"
        echo "   Password: easyjob_password"
        ;;
    "stop")
        echo "Stopping EasyJob database..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose-db.yml down
        echo "✅ Database stopped!"
        ;;
    "restart")
        echo "Restarting EasyJob database..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose-db.yml restart
        echo "✅ Database restarted!"
        ;;
    "logs")
        echo "Showing database logs..."
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose-db.yml logs -f
        ;;
    "reset")
        echo "⚠️  Resetting database (this will delete all data)..."
        read -p "Are you sure? This will permanently delete all data! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Stopping containers and removing volumes..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker/docker-compose-db.yml down -v
            echo "🚀 Starting fresh database..."
            docker-compose -f docker/docker-compose-db.yml up -d
            echo "✅ Database reset complete!"
        else
            echo "❌ Reset cancelled"
        fi
        ;;
    "backup")
        echo "Creating database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_file="backup_${timestamp}.sql"
        
        if docker exec easyjob-postgres pg_dump -U easyjob_user easyjob_db > "$backup_file"; then
            echo "✅ Backup created: $backup_file"
            echo "📊 Backup size: $(du -h "$backup_file" | cut -f1)"
        else
            echo "❌ Backup failed!"
            exit 1
        fi
        ;;
    "restore")
        if [ -z "$2" ]; then
            echo "❌ Please specify backup file: ./run-database.sh restore backup_file.sql"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            echo "❌ Backup file not found: $2"
            exit 1
        fi
        
        echo "Restoring database from $2..."
        echo "⚠️  This will overwrite all existing data!"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if docker exec -i easyjob-postgres psql -U easyjob_user easyjob_db < "$2"; then
                echo "✅ Database restored successfully!"
            else
                echo "❌ Restore failed!"
                exit 1
            fi
        else
            echo "❌ Restore cancelled"
        fi
        ;;
    "status")
        echo "Database status:"
        cd "$PROJECT_ROOT"
        docker-compose -f docker/docker-compose-db.yml ps
        echo ""
        echo "Container health:"
        docker exec easyjob-postgres pg_isready -U easyjob_user -d easyjob_db && echo "✅ PostgreSQL: Healthy" || echo "❌ PostgreSQL: Not responding"
        ;;
    "connect")
        echo "Connecting to PostgreSQL database..."
        docker exec -it easyjob-postgres psql -U easyjob_user -d easyjob_db
        ;;
    "query")
        if [ -z "$2" ]; then
            echo "❌ Please specify SQL query: ./run-database.sh query 'SELECT * FROM users;'"
            exit 1
        fi
        echo "Executing query: $2"
        docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "$2"
        ;;
    "stats")
        echo "📊 Database Statistics:"
        echo "======================"
        docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "
        SELECT 
            schemaname,
            relname as tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_rows
        FROM pg_stat_user_tables 
        ORDER BY live_rows DESC;
        "
        ;;
    "clean")
        echo "🧹 Cleaning up unused Docker resources..."
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: ./run-database.sh <command>"
        echo ""
        echo "Commands:"
        echo "  start     - Start the database containers"
        echo "  stop      - Stop the database containers"
        echo "  restart   - Restart the database containers"
        echo "  logs      - Show database logs (follow mode)"
        echo "  reset     - Reset database (delete all data)"
        echo "  backup    - Create database backup"
        echo "  restore   - Restore database from backup"
        echo "  status    - Show database status"
        echo "  connect   - Connect to PostgreSQL shell"
        echo "  query     - Execute SQL query"
        echo "  stats     - Show database statistics"
        echo "  clean     - Clean up Docker resources"
        echo "  help      - Show this help"
        echo ""
        echo "Examples:"
        echo "  ./run-database.sh start"
        echo "  ./run-database.sh backup"
        echo "  ./run-database.sh restore backup_20241201_143022.sql"
        echo "  ./run-database.sh query 'SELECT COUNT(*) FROM applications;'"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use './run-database.sh help' for available commands"
        exit 1
        ;;
esac 