// INWIN — AI Project Cost Estimator: build, push and deploy backend + frontend.
// Repository layout (one repo):  backend/  web/  Jenkinsfile
//
// Jenkins credentials used:
//   dockerHubCreds           Username/password  — Docker Hub (required)
//   inwin-anthropic-api-key  Secret text        — only when USE_CLAUDE is ticked
//
// Result on the agent:
//   inwin-backend   → http://<server>:8880/api/health   (data in Docker volume "inwin-data")
//   inwin-frontend  → http://<server>:5152               (proxies /api to inwin-backend)

pipeline {
    agent { label "vpsnew" }

    parameters {
        booleanParam(name: 'USE_CLAUDE', defaultValue: false, description: 'Pass the Anthropic API key (credential inwin-anthropic-api-key) to the backend. Off = offline rule-based extractor.')
        booleanParam(name: 'SEED_DEMO',  defaultValue: true,  description: 'Load the sample enquiries when the database is empty (never wipes data).')
    }

    environment {
        // Leave empty when the job is "Pipeline script from SCM" (uses that repo);
        // otherwise set your public GitHub repo URL here.
        GIT_REPO_URL   = ""
        GIT_BRANCH     = "main"

        DOCKER_REPO    = "santhakumar4343"
        IMAGE_NAME_BE  = "inwin-backend"
        IMAGE_NAME_FE  = "inwin-frontend"
        BUILD_TAG      = "${env.BUILD_NUMBER}-${new Date().format('dd-MMM-yyyy-hh-mm-a', TimeZone.getTimeZone('Asia/Kolkata'))}"
        FULL_IMAGE_BE  = "${DOCKER_REPO}/${IMAGE_NAME_BE}:${BUILD_TAG}"
        FULL_IMAGE_FE  = "${DOCKER_REPO}/${IMAGE_NAME_FE}:${BUILD_TAG}"

        CONTAINER_BE   = "inwin-backend"
        CONTAINER_FE   = "inwin-frontend"
        NETWORK        = "inwin-net"
        DATA_VOLUME    = "inwin-data"
        PORT_BE        = "8880"
        PORT_FE        = "5152"
        DOCKER_BUILDKIT = "1"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {

        stage('Clean Workspace') {
            steps { cleanWs() }
        }

        stage('Clone Repository') {
            steps {
                script {
                    if (env.GIT_REPO_URL?.trim()) {
                        // Public repo: no credentials needed.
                        git branch: env.GIT_BRANCH, url: env.GIT_REPO_URL
                    } else {
                        checkout scm
                    }
                }
            }
        }

        stage('Backend Tests') {
            steps {
                // The "test" stage of backend/Dockerfile runs pytest — a failing test stops the pipeline here.
                sh 'docker build --target test -t ${IMAGE_NAME_BE}:test-${BUILD_NUMBER} backend'
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerHubCreds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    // Single-quoted: secrets stay in the shell, never interpolated into the Groovy string/logs.
                    sh '''
                        set -e
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                        docker build --target runtime -t "$FULL_IMAGE_BE" backend
                        docker tag "$FULL_IMAGE_BE" "$DOCKER_REPO/$IMAGE_NAME_BE:latest"

                        docker build -t "$FULL_IMAGE_FE" web
                        docker tag "$FULL_IMAGE_FE" "$DOCKER_REPO/$IMAGE_NAME_FE:latest"

                        docker push "$FULL_IMAGE_BE"
                        docker push "$DOCKER_REPO/$IMAGE_NAME_BE:latest"
                        docker push "$FULL_IMAGE_FE"
                        docker push "$DOCKER_REPO/$IMAGE_NAME_FE:latest"

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy Backend Container') {
            steps {
                script {
                    def creds = []
                    if (params.USE_CLAUDE) {
                        creds << string(credentialsId: 'inwin-anthropic-api-key', variable: 'ANTHROPIC_API_KEY')
                    }
                    withCredentials(creds) {
                        withEnv(["SEED_DEMO=${params.SEED_DEMO}"]) {
                            sh '''
                                set -e
                                docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"
                                docker volume inspect "$DATA_VOLUME" >/dev/null 2>&1 || docker volume create "$DATA_VOLUME"

                                docker rm -f "$CONTAINER_BE" || true
                                docker run -d \
                                  --restart=always \
                                  --name "$CONTAINER_BE" \
                                  --network "$NETWORK" \
                                  -p "$PORT_BE:8880" \
                                  -v "$DATA_VOLUME:/data" \
                                  -e SEED_DEMO="$SEED_DEMO" \
                                  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
                                  "$FULL_IMAGE_BE"
                            '''
                        }
                    }
                }
            }
        }

        stage('Deploy Frontend Container') {
            steps {
                sh '''
                    set -e
                    docker rm -f "$CONTAINER_FE" || true
                    docker run -d \
                      --restart=always \
                      --name "$CONTAINER_FE" \
                      --network "$NETWORK" \
                      -p "$PORT_FE:5152" \
                      -e BACKEND_URL="http://$CONTAINER_BE:8880" \
                      "$FULL_IMAGE_FE"
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    set -e
                    curl -fsS --retry 20 --retry-all-errors --retry-delay 3 "http://localhost:$PORT_BE/api/health"
                    curl -fsS --retry 20 --retry-all-errors --retry-delay 3 "http://localhost:$PORT_FE/healthz"
                    curl -fsS "http://localhost:$PORT_FE/api/health"
                    echo "Deployed: frontend http://<server>:$PORT_FE  backend http://<server>:$PORT_BE"
                '''
            }
        }
    }

    post {
        failure {
            sh 'docker logs --tail 100 "$CONTAINER_BE" || true; docker logs --tail 100 "$CONTAINER_FE" || true'
            echo "Pipeline failed."
        }
        always {
            sh 'docker rmi "$IMAGE_NAME_BE:test-$BUILD_NUMBER" || true; docker image prune -f || true'
            echo "Pipeline execution completed."
        }
    }
}
