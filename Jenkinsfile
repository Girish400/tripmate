pipeline {
  agent any

  tools {
    // Must match the name configured in:
    // Jenkins → Manage Jenkins → Tools → NodeJS installations
    nodejs 'Node22'
  }

  environment {
    CI = 'true'
  }

  stages {

    stage('Install') {
      steps {
        sh 'node --version'
        sh 'npm --version'
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Unit Tests') {
      steps {
        sh '''
          npx vitest run tests/unit \
            --reporter=verbose \
            --reporter=junit \
            --outputFile.junit=reports/unit-results.xml
        '''
      }
      post {
        always {
          junit testResults: 'reports/unit-results.xml', allowEmptyResults: true
        }
      }
    }

    stage('Integration Tests') {
      steps {
        sh '''
          npx vitest run tests/integration \
            --reporter=verbose \
            --reporter=junit \
            --outputFile.junit=reports/integration-results.xml
        '''
      }
      post {
        always {
          junit testResults: 'reports/integration-results.xml', allowEmptyResults: true
        }
      }
    }

    stage('Coverage') {
      steps {
        sh '''
          npx vitest run \
            --coverage \
            --reporter=junit \
            --outputFile.junit=reports/coverage-results.xml
        '''
      }
      post {
        always {
          junit testResults: 'reports/coverage-results.xml', allowEmptyResults: true
          publishHTML(target: [
            allowMissing         : true,
            alwaysLinkToLastBuild: true,
            keepAll              : true,
            reportDir            : 'coverage',
            reportFiles          : 'index.html',
            reportName           : 'Coverage Report',
          ])
        }
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
        archiveArtifacts artifacts: 'dist/**', fingerprint: true
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    success {
      echo 'All stages passed.'
    }
    failure {
      echo 'Pipeline failed — check the test reports above.'
    }
  }
}
