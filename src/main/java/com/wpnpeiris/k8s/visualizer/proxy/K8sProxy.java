/**
 *
 */
package com.wpnpeiris.k8s.visualizer.proxy;

import static com.wpnpeiris.k8s.visualizer.K8sVisualizerProperties.K8S_MASTER_URL;

import com.wpnpeiris.k8s.visualizer.K8sVisualizerProperties;

import io.fabric8.kubernetes.api.model.HorizontalPodAutoscalerList;
import io.fabric8.kubernetes.api.model.NamespaceList;
import io.fabric8.kubernetes.api.model.NodeList;
import io.fabric8.kubernetes.api.model.PodList;
import io.fabric8.kubernetes.api.model.ReplicationControllerList;
import io.fabric8.kubernetes.api.model.ServiceList;
import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.ConfigBuilder;
import io.fabric8.kubernetes.client.DefaultKubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClient;

/**
 * @author Pradeep Peiris
 *
 */
public class K8sProxy {

    private static K8sProxy instance;

    private KubernetesClient client;

    private K8sProxy() {
        Config config = new ConfigBuilder()
                .withMasterUrl(
                        K8sVisualizerProperties.getProperty(K8S_MASTER_URL))
                .build();
        this.client = new DefaultKubernetesClient(config);
    }

    public static K8sProxy getInstance() {
        if (instance == null) {
            instance = new K8sProxy();
        }
        return instance;
    }

    public ReplicationControllerList getReplicationControllerList() {
        return client.replicationControllers().list();
    }

    public ServiceList getServiceList() {
        return client.services().list();
    }

    public PodList getPodList() {
        return client.pods().list();
    }

    public NodeList getNodeList() {
        return client.nodes().list();
    }

    public NamespaceList getNamespacesList() {
        return client.namespaces().list();
    }

    public HorizontalPodAutoscalerList getAutoscalerList() {
        return client.autoscaling().horizontalPodAutoscalers().list();
    }
}
