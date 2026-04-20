pipeline {
    agent any

    environment {
        NEXUS_REGISTRY = 'nexus:9500'
        NEXUS_CREDENTIALS = 'nexus-docker'          // Jenkins credentials ID for Nexus
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Build Backend') {
            steps {
                dir('backend') {
                    script {
                        docker.build("${NEXUS_REGISTRY}/memberflow-backend:${IMAGE_TAG}", '.')
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    script {
                        docker.build("${NEXUS_REGISTRY}/memberflow-frontend:${IMAGE_TAG}", '.')
                    }
                }
            }
        }

        stage('Build Website') {
            steps {
                dir('website') {
                    script {
                        docker.build("${NEXUS_REGISTRY}/memberflow-website:${IMAGE_TAG}", '.')
                    }
                }
            }
        }

        stage('Push to Nexus') {
            steps {
                script {
                    docker.withRegistry("http://${NEXUS_REGISTRY}", NEXUS_CREDENTIALS) {
                        docker.image("${NEXUS_REGISTRY}/memberflow-backend:${IMAGE_TAG}").push()
                        docker.image("${NEXUS_REGISTRY}/memberflow-backend:${IMAGE_TAG}").push('latest')
                        docker.image("${NEXUS_REGISTRY}/memberflow-frontend:${IMAGE_TAG}").push()
                        docker.image("${NEXUS_REGISTRY}/memberflow-frontend:${IMAGE_TAG}").push('latest')
                        docker.image("${NEXUS_REGISTRY}/memberflow-website:${IMAGE_TAG}").push()
                        docker.image("${NEXUS_REGISTRY}/memberflow-website:${IMAGE_TAG}").push('latest')
                    }
                }
            }
        }
    }

    post {
        always {
            sh "docker rmi ${NEXUS_REGISTRY}/memberflow-backend:${IMAGE_TAG} || true"
            sh "docker rmi ${NEXUS_REGISTRY}/memberflow-frontend:${IMAGE_TAG} || true"
            sh "docker rmi ${NEXUS_REGISTRY}/memberflow-website:${IMAGE_TAG} || true"
        }
    }
}
