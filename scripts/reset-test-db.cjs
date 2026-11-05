const path = require('path');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');

const repositoryRoot = path.resolve(__dirname, '..');
dotenv.config({
    path: path.join(repositoryRoot, '.env.test'),
    override: false
});

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set to initialize the test database.');
    process.exitCode = 1;
} else {
    execFileSync('psql', [
        '--dbname', process.env.DATABASE_URL,
        '--set', 'ON_ERROR_STOP=1',
        '--file', path.join(repositoryRoot, 'src/config/SQL/init.sql')
    ], {
        cwd: repositoryRoot,
        stdio: 'inherit'
    });
}