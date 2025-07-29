# EasyJob Database Setup

This directory contains all the necessary files to set up and manage the EasyJob PostgreSQL database using Docker containers.

## 🚀 Quick Start

1. **Start the database:**
   ```bash
   ./docker/run-database.sh start
   ```

2. **Access pgAdmin:** Open http://localhost:8080
   - Email: `admin@example.com`
   - Password: `admin123`

3. **Connect to PostgreSQL:**
   - Host: `localhost` (or `postgres` from pgAdmin)
   - Port: `5432`
   - Database: `easyjob_db`
   - Username: `easyjob_user`
   - Password: `easyjob_password`

## 📁 Files Structure

```
docker/
├── docker-compose-db.yml     # Docker Compose configuration
├── run-database.sh          # Database management script
├── env.example              # Environment variables template
├── init-scripts/            # Database initialization scripts
│   └── 01-init-database.sql # Database schema and sample data
└── DATABASE_README.md       # This file
```

## 🗄️ Database Schema

The database includes the following tables:

### Core Tables
- **users** - User accounts (username, email, password, timestamps)
- **resume** - Resume files with metadata (name, extension, path, description, default flag)
- **ai_settings** - AI model configurations per user
- **companies** - Company information
- **jobs** - Job postings from various platforms
- **applications** - User job applications (now includes resume_id reference)
- **questions_answers** - Form questions and AI-generated answers

### Key Features
- **UUID Primary Keys** - For better security and scalability
- **Separate Resume Management** - Multiple resumes per user with default selection
- **Resume File Tracking** - Path, extension, and metadata storage
- **Streamlined Job Data** - Core job information without salary complexity
- **Full-text Search** - On job descriptions and titles
- **Automatic Timestamps** - Created/updated tracking
- **Foreign Key Constraints** - Data integrity and referential integrity
- **Unique Constraints** - One default resume per user, prevent duplicate applications
- **Optimized Indexes** - Fast queries on common search patterns

## 📋 Detailed Database Schema

### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 2. Resume Table
```sql
CREATE TABLE resume (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    extension VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    short_description TEXT,
    creation_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_default_per_user UNIQUE (user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);
```
### 1. resume_structure Table
```sql
CREATE TABLE resume_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID REFERENCES resume(id) ON DELETE CASCADE,
    personal_info JSONB NOT NULL,
    summary JSONB NOT NULL,
    experiences JSONB NOT NULL,
    educations JSONB NOT NULL,
    skills JSONB NOT NULL,
    languages JSONB NOT NULL,
    projects JSONB NOT NULL,
    certifications JSONB NOT NULL,
    interests JSONB NOT NULL
);
```
### 3. AI Settings Table
```sql
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ai_provider VARCHAR(50) NOT NULL,
    ai_model VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, ai_provider, ai_model)
);
```

### 4. Companies Table
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(50),
    location VARCHAR(255),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Jobs Table
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    job_type VARCHAR(50),
    platform VARCHAR(50) NOT NULL,
    platform_job_id VARCHAR(255),
    job_url TEXT NOT NULL,
    job_description TEXT,
    applicant_count INTEGER DEFAULT 0,
    posted_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(platform, platform_job_id)
);
```

### 6. Applications Table
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    ai_settings_id UUID REFERENCES ai_settings(id),
    resume_id UUID NOT NULL REFERENCES resume(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT NOW(),
    response_received_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);
```

### 7. Questions Answers Table
```sql
CREATE TABLE questions_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_type VARCHAR(50),
    ai_model_used VARCHAR(100),
    confidence_score DECIMAL(3,2),
    is_skipped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🛠️ Database Management

### Using the Management Script

```bash
# Start database
./docker/run-database.sh start

# Stop database
./docker/run-database.sh stop

# View logs
./docker/run-database.sh logs

# Reset database (⚠️ deletes all data)
./docker/run-database.sh reset

# Create backup
./docker/run-database.sh backup

# Restore from backup
./docker/run-database.sh restore backup_20241201_143022.sql

# Show database status
./docker/run-database.sh status

# Connect to PostgreSQL shell
./docker/run-database.sh connect

# Execute SQL query
./docker/run-database.sh query "SELECT COUNT(*) FROM users;"

# Show database statistics
./docker/run-database.sh stats
```

### Manual Docker Commands

```bash
# Start containers
docker-compose -f docker/docker-compose-db.yml up -d

# Stop containers
docker-compose -f docker/docker-compose-db.yml down

# View logs
docker-compose -f docker/docker-compose-db.yml logs -f

# Connect to PostgreSQL
docker exec -it easyjob-postgres psql -U easyjob_user -d easyjob_db
```

## 🔧 Node.js Integration

### Install Dependencies

```bash
npm install pg
```

### Using the Database Models

```javascript
// Import models
const User = require('./src/database/models/User');
const Application = require('./src/database/models/Application');

// Create a new user
const user = await User.create({
    username: 'john_doe',
    email: 'john@example.com',
    password_hash: 'hashed_password'
});

// Create a resume for the user
const resume = await Resume.create({
    name: 'Software Engineer Resume',
    extension: 'pdf',
    path: '/uploads/john_doe_resume.pdf',
    short_description: 'Full-stack developer with 5 years experience',
    user_id: user.id,
    is_default: true
});

// Find user by email
const user = await User.findByEmail('john@example.com');

// Create an application
const application = await Application.create({
    user_id: user.id,
    job_id: 'job-uuid',
    ai_settings_id: 'ai-settings-uuid',
    resume_id: resume.id,
    status: 'applied',
    notes: 'Applied via EasyJob extension'
});

// Get user's applications
const applications = await user.getApplications();
```

### Database Connection

```javascript
const { pool, testConnection } = require('./src/database/connection');

// Test connection
await testConnection();

// Execute query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

## 📊 Sample Data

The database is initialized with sample data:

- **Test User**: `testuser` / `test@easyjob.local`
- **Companies**: Tech Corp, StartupXYZ, Global Solutions, AI Innovations
- **Jobs**: Software Engineer, Frontend Developer positions
- **AI Settings**: Default Ollama configuration with qwen2.5:3b model
- **Applications**: Sample application with questions/answers
- **Resume**: Sample resume entries linked to applications

**Note**: The resume table is currently empty. You'll need to create resume records before creating new applications since `resume_id` is required.

## 🔄 Recent Database Changes

### Schema Updates Made:
1. **✅ Removed `application_history` table** - Simplified application tracking
2. **✅ Added `resume` table** - Separate resume management with multiple resumes per user
3. **✅ Removed resume fields from `users` table** - Better data normalization
4. **✅ Added `resume_id` to `applications` table** - Track which resume was used for each application
5. **✅ Removed salary and expiration fields from `jobs` table** - Simplified job data model

### Migration Notes:
- **Breaking Change**: Applications now require a valid `resume_id`
- **Data Integrity**: Cannot delete resumes that are referenced by applications
- **Unique Constraint**: Only one default resume allowed per user
- **File Management**: Resume table tracks file paths and metadata
- **Simplified Jobs**: Removed salary and expiration tracking from jobs table for cleaner data model

## 🔐 Security Considerations

### Production Deployment

1. **Change Default Passwords**:
   ```bash
   # Update docker-compose-db.yml
   POSTGRES_PASSWORD=strong_random_password
   PGADMIN_DEFAULT_PASSWORD=strong_admin_password
   ```

2. **Use Environment Variables**:
   ```bash
   # Copy and customize environment file
   cp docker/env.example docker/.env
   # Edit docker/.env with your values
   ```

3. **Network Security**:
   - Use Docker networks for container communication
   - Expose only necessary ports
   - Use SSL/TLS for production connections

4. **Data Encryption**:
   - Encrypt sensitive data at rest
   - Use connection encryption
   - Implement proper key management

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Check what's using port 5432
   lsof -i :5432
   # Kill the process or change port in docker-compose-db.yml
   ```

2. **Permission Denied**:
   ```bash
   # Make script executable
   chmod +x docker/run-database.sh
   ```

3. **Database Connection Failed**:
   ```bash
   # Check container status
   docker ps
   # View logs
   docker logs easyjob-postgres
   ```

4. **pgAdmin Can't Connect**:
   - Use `postgres` as hostname (not `localhost`)
   - Or use `host.docker.internal` on Mac/Windows

### Database Recovery

```bash
# If database is corrupted
./docker/run-database.sh reset

# If you have a backup
./docker/run-database.sh restore your_backup.sql
```

## 📈 Performance Optimization

### Monitoring

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Optimization Tips

1. **Regular VACUUM**: Automatically handled by PostgreSQL
2. **Index Maintenance**: Monitor slow queries and add indexes
3. **Connection Pooling**: Use connection pooling in production
4. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries

## 🔄 Backup Strategy

### Automated Backups

```bash
# Create daily backup script
cat > backup-daily.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec easyjob-postgres pg_dump -U easyjob_user easyjob_db > "$BACKUP_DIR/easyjob_$DATE.sql"
# Keep only last 7 days
find "$BACKUP_DIR" -name "easyjob_*.sql" -mtime +7 -delete
EOF

chmod +x backup-daily.sh
```

### Backup to Cloud

```bash
# Upload to AWS S3 (example)
aws s3 cp backup_20241201_143022.sql s3://your-bucket/easyjob-backups/
```

## 🚀 Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: easyjob_db
      POSTGRES_USER: easyjob_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]

secrets:
  db_password:
    external: true

volumes:
  postgres_data:
```

### Kubernetes

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: easyjob_db
        - name: POSTGRES_USER
          value: easyjob_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Docker and PostgreSQL logs
3. Consult PostgreSQL documentation
4. Create an issue in the project repository 