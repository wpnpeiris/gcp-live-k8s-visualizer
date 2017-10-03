# k8s-visualizer
The original work from [gcp-live-k8s-visualizer](https://github.com/brendandburns/gcp-live-k8s-visualizer) 
is further improved to run k8s-visualizer as a standalone application.

To avoid k8s-visualizer as a proxy service (ie kubectl proxy --www=path/to/gcp-live-k8s-visualizer --www-prefix=/my-mountpoint/ --api-prefix=/api/), 
the requests to k8s cluster API is delegated through an inbuild proxy based on [Fabric8io's kubernetes-client](https://github.com/fabric8io/kubernetes-client).
