# k8s-visualizer
The original work from [gcp-live-k8s-visualizer](https://github.com/brendandburns/gcp-live-k8s-visualizer) 
is further improved to run k8s-visualizer as a standalone application.

To avoid k8s-visualizer as a proxy service (ie kubectl proxy --www=path/to/gcp-live-k8s-visualizer --www-prefix=/my-mountpoint/ --api-prefix=/api/), 
the requests to k8s cluster API is delegated through an inbuild proxy based on [Fabric8io's kubernetes-client](https://github.com/fabric8io/kubernetes-client).

### Usage
* ```git clone https://github.com/wpnpeiris/gcp-live-k8s-visualizer.git```
* cd gcp-live-k8s-visualizer && mvn clean package
* java -jar target/k8s-visualizer-0.1.jar com.wpnpeiris.k8s-visualizer.Main
* Access k8s-visualizer at http://hostip:port

### Configuration
* Specify k8s master URL and application specific configurations in conf/k8s-visualizer.properties
* Update conf/fabrico8io-k8s-client.properties for k8s security/connection configuration
   
