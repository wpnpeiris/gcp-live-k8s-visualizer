/**
 *
 */
package com.wpnpeiris.k8s.visualizer;

import java.io.FileInputStream;
import java.util.Properties;

import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.wpnpeiris.k8s.visualizer.resource.VisualizerResource;

/**
 * @author Pradeep Peiris
 *
 */
public class Main {
    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    private static final String FABRICO8IO_SYSTEM_PROP_FILE = "conf/fabrico8io-k8s-client.properties";
    private static final String APPLICATION_PROP_FILE = "conf/k8s-visualizer.properties";

    public static void main(String[] args) throws Exception {
        logger.info("Start k8s Visualizer");
        try {
            applySystemProperties();
            applyApplicationProperties();
            startService();
        } catch (Exception e) {
            logger.error("Error in starting k8s Visualizer", e);
        }

    }

    private static void applyApplicationProperties() throws Exception {
        logger.info("Apply application properties");
        K8sVisualizerProperties.load(APPLICATION_PROP_FILE);

    }

    private static void startService() throws Exception {
        logger.info("Start k8s Visualizer Service");
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");

        ResourceHandler resourceHandler = new ResourceHandler();
        resourceHandler.setDirectoriesListed(true);
        resourceHandler.setWelcomeFiles(new String[] { "index.html" });
        resourceHandler.setResourceBase("web");

        Server jettyServer = new Server(Integer.valueOf(K8sVisualizerProperties.getProperty(K8sVisualizerProperties.APP_PORT)));
        HandlerList handlers = new HandlerList();
        handlers.setHandlers(new Handler[] { resourceHandler, context });
        jettyServer.setHandler(handlers);

        ServletHolder jerseyServlet = context.addServlet(
                org.glassfish.jersey.servlet.ServletContainer.class, "/*");
        jerseyServlet.setInitOrder(0);

        jerseyServlet.setInitParameter("jersey.config.server.provider.classnames", VisualizerResource.class.getCanonicalName());
        try {
            jettyServer.start();
            jettyServer.join();
        } finally {
            jettyServer.destroy();
        }
    }

    private static void applySystemProperties() throws Exception {
        logger.info("Apply Fbaric8io kubernetes-client system properties");
        Properties systemProperties = new Properties();
        systemProperties.load(new FileInputStream(FABRICO8IO_SYSTEM_PROP_FILE));
        systemProperties.forEach((k, v) -> System.setProperty((String) k, (String) v));
    }
}
