/**
 *
 */
package com.wpnpeiris.k8s.visualizer;

import java.io.FileInputStream;
import java.util.Properties;

/**
 * @author Pradeep Peiris
 *
 */
public class K8sVisualizerProperties {
    public static final String APP_PORT = "application.port";
    public static final String K8S_MASTER_URL = "k8s.master.url";
    public static final String K8S_NAMESPACE = "k8s.visualize.namespace";
    public static final String K8S_LABEL = "k8s.visualize.label";

    private static Properties applicationProperties = new Properties();

    public static void load(String propertiesFile) throws Exception {
        applicationProperties.load(new FileInputStream(propertiesFile));
    }

    public static String getProperty(String key) {
        return applicationProperties.getProperty(key);
    }


}
