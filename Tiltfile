docker_build('auth-server-tilt', '.', 
    dockerfile='./Dockerfile')
k8s_yaml('./deploy/kubernetes/kidsloop-auth-server-deployment.yaml')

k8s_resource('auth-server', labels=['auth-server'], port_forwards=8083)

# appears to fix issues with not being able to communicate with local registry
# https://github.com/docker/for-mac/issues/3611