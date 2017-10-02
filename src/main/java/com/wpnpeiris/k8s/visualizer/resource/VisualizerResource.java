/**
 *
 */
package com.wpnpeiris.k8s.visualizer.resource;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

import com.wpnpeiris.k8s.visualizer.proxy.K8sProxy;

import io.fabric8.kubernetes.api.model.HorizontalPodAutoscalerList;
import io.fabric8.kubernetes.api.model.NamespaceList;
import io.fabric8.kubernetes.api.model.NodeList;
import io.fabric8.kubernetes.api.model.PodList;
import io.fabric8.kubernetes.api.model.ReplicationControllerList;
import io.fabric8.kubernetes.api.model.ServiceList;

/**
 * @author Pradeep Peiris
 *
 */

@Path("api/v1")
public class VisualizerResource {

    @GET
    @Path("replicationcontrollers")
    @Produces(MediaType.APPLICATION_JSON)
    public ReplicationControllerList getReplicationControllers() {
        return K8sProxy.getInstance().getReplicationControllerList();
    }

    @GET
    @Path("autoscalers")
    @Produces(MediaType.APPLICATION_JSON)
    public HorizontalPodAutoscalerList getAutoScalers() {
        return K8sProxy.getInstance().getAutoscalerList();
    }

    @GET
    @Path("services")
    @Produces(MediaType.APPLICATION_JSON)
    public ServiceList getServices() {
        return K8sProxy.getInstance().getServiceList();
    }

    @GET
    @Path("pods")
    @Produces(MediaType.APPLICATION_JSON)
    public PodList getPods() {
        return K8sProxy.getInstance().getPodList();
    }

    @GET
    @Path("nodes")
    @Produces(MediaType.APPLICATION_JSON)
    public NodeList getNodes() {
        return K8sProxy.getInstance().getNodeList();
    }

    @GET
    @Path("namespaces")
    @Produces(MediaType.APPLICATION_JSON)
    public NamespaceList getNamespaces() {
        return K8sProxy.getInstance().getNamespacesList();
    }

}
