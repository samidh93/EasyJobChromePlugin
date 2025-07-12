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
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-db.yml up -d
        
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
        echo ""
        echo "🌐 Network: easyjob-network created"
        echo "   Ready for API server connection"
        ;;
    
    "stop")
        echo "Stopping EasyJob database..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-db.yml down
        echo "✅ Database stopped!"
        ;;
    
    "restart")
        echo "Restarting EasyJob database..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-db.yml restart
        echo "✅ Database restarted!"
        ;;
    
    "logs")
        echo "Showing database logs..."
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-db.yml logs -f
        ;;
    
    "reset")
        echo "⚠️  Resetting database (this will delete all data)..."
        read -p "Are you sure? This will permanently delete all data! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Stopping containers and removing volumes..."
            cd "$DOCKER_DIR"
            docker-compose -f docker-compose-db.yml down -v
            echo "🚀 Starting fresh database..."
            docker-compose -f docker-compose-db.yml up -d
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
        cd "$DOCKER_DIR"
        docker-compose -f docker-compose-db.yml ps
        echo ""
        echo "Container health:"
        docker exec easyjob-postgres pg_isready -U easyjob_user -d easyjob_db && echo "✅ PostgreSQL: Healthy" || echo "❌ PostgreSQL: Not responding"
        echo ""
        echo "Network status:"
        docker network ls | grep easyjob-network && echo "✅ Network: easyjob-network exists" || echo "❌ Network: easyjob-network missing"
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
    
    "remove-history")
        echo "🗑️  Removing application_history table..."
        echo "⚠️  This will permanently delete the application_history table and all its data!"
        read -p "Are you sure? This action cannot be undone! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔧 Dropping application_history table..."
            
            # Drop the trigger first
            docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "
                DROP TRIGGER IF EXISTS log_application_status_change_trigger ON applications;
            " 2>/dev/null || echo "⚠️  Trigger already dropped or doesn't exist"
            
            # Drop the function
            docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "
                DROP FUNCTION IF EXISTS log_application_status_change();
            " 2>/dev/null || echo "⚠️  Function already dropped or doesn't exist"
            
            # Drop the table
            docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "
                DROP TABLE IF EXISTS application_history CASCADE;
            " 2>/dev/null || echo "⚠️  Table already dropped or doesn't exist"
            
            # Drop the index
            docker exec easyjob-postgres psql -U easyjob_user -d easyjob_db -c "
                DROP INDEX IF EXISTS idx_history_application;
                DROP INDEX IF EXISTS idx_history_status;
            " 2>/dev/null || echo "⚠️  Indexes already dropped or don't exist"
            
            echo "✅ application_history table removed successfully!"
            echo "📝 Note: Application status changes will no longer be automatically logged"
        else
            echo "❌ Operation cancelled"
        fi
        ;;
    
    "help"|*)
        echo "Usage: $0 COMMAND [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  start      Start PostgreSQL database + pgAdmin"
        echo "  stop       Stop all database containers"
        echo "  restart    Restart all database containers"
        echo "  logs       Show database logs"
        echo "  reset      Reset database (deletes all data)"
        echo "  backup     Create database backup"
        echo "  restore    Restore from backup file"
        echo "  status     Show container status and health"
        echo "  connect    Connect to PostgreSQL shell"
        echo "  query      Execute SQL query"
        echo "  remove-history  Remove application_history table"
        echo "  help       Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start           Start database"
        echo "  $0 backup          Create backup"
        echo "  $0 restore backup_20241201_143022.sql"
        echo "  $0 query 'SELECT COUNT(*) FROM users;'"
        echo "  $0 remove-history  Remove application_history table"
        ;;
esac 