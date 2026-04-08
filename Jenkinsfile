pipeline {
  agent any

  tools {
    // Must match the name configured in:
    // Jenkins → Manage Jenkins → Tools → NodeJS installations
    nodejs 'Node22'
  }

  environment {
    CI       = 'true'
    PROJ_DIR = 'C:/Users/Girish/Desktop/tripmate'
  }

  stages {

    stage('Install') {
      steps {
        bat """
          cd /d "%PROJ_DIR%"
          node --version
          npm --version
        """
      }
    }

    stage('Lint') {
      steps {
        // Warnings are OK; only hard ESLint errors (exit 1) fail the stage.
        bat """
          cd /d "%PROJ_DIR%"
          npm run lint -- --max-warnings 9999
        """
      }
    }

    stage('Unit Tests') {
      steps {
        bat """
          if not exist "%WORKSPACE%\\reports" mkdir "%WORKSPACE%\\reports"
          cd /d "%PROJ_DIR%"
          npx vitest run tests/unit --reporter=verbose --reporter=junit "--outputFile.junit=%WORKSPACE%\\reports\\unit-results.xml"
        """
      }
      post {
        always {
          junit testResults: 'reports/unit-results.xml', allowEmptyResults: true
        }
      }
    }

    stage('Integration Tests') {
      steps {
        bat """
          if not exist "%WORKSPACE%\\reports" mkdir "%WORKSPACE%\\reports"
          cd /d "%PROJ_DIR%"
          npx vitest run tests/integration --reporter=verbose --reporter=junit "--outputFile.junit=%WORKSPACE%\\reports\\integration-results.xml"
        """
      }
      post {
        always {
          junit testResults: 'reports/integration-results.xml', allowEmptyResults: true
        }
      }
    }

    stage('Coverage') {
      steps {
        bat """
          if not exist "%WORKSPACE%\\reports" mkdir "%WORKSPACE%\\reports"
          cd /d "%PROJ_DIR%"
          npx vitest run --coverage --reporter=junit "--outputFile.junit=%WORKSPACE%\\reports\\coverage-results.xml"
        """
      }
      post {
        always {
          junit testResults: 'reports/coverage-results.xml', allowEmptyResults: true
        }
      }
    }

    stage('Build') {
      steps {
        bat """
          cd /d "%PROJ_DIR%"
          npm run build
        """
        archiveArtifacts artifacts: "${env.PROJ_DIR}/dist/**", fingerprint: true
      }
    }
  }

  post {
    success {
      echo 'All stages passed.'
    }
    failure {
      echo 'Pipeline failed — check the test reports above.'
    }
  }
}
