/**
Copyright 2014 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var PENDING_POD_NODE_NAME = "pending";
var NODE_WIDTH_PER_POD = 200;
var GROUP_HEIGHT = 400;
var NODE_LEFT_MARGIN = 250;
var NODE_PADDING = 20;
var POD_LEFT_PADDING = 10;
var POD_TOP_PADDING = 160;
var SERVICE_LEFT_PADDING = 40;

var truncate = function(str, width, left) {
  if (!str) return "";

    if (str.length > width) {
    if (left) {
        return str.slice(0, width) + "...";
    } else {
        return "..." + str.slice(str.length - width, str.length);
    }
    }
    return str;
}

var pods = [];
var services = [];
var uses = {};
var groups = {};
var maxPodsPerNode = {};

var groupServiceBySelector = function(index, value) {
    if(value.spec.selector && value.spec.selector.entry) {
        var key = value.spec.selector.entry[0].key + "_" + value.spec.selector.entry[0].value;
        var list = groups[key];
        if (!list) {
            list = [];
            groups[key] = list;
        }
        list.push(value);
    }
}

var groupPodsByLabel = function(index, value) {
    $.each(value.metadata.labels.entry, function(k, v) {
        var key = v.key + "_" + v.value;
        if(groups[key]) {
            groups[key].push(value);
        }
    });
}

var updateServiceGroups = function() {
    $.each(services.items, groupServiceBySelector);
    $.each(pods.items, groupPodsByLabel);
}

var groupNodeWithPodInfo = function(index, value) {
    var podsPerNode = {};
    $.each(value, function(k, v) {
        if(v.type == "pod") {
            var key = v.spec.nodeName ? v.spec.nodeName : PENDING_POD_NODE_NAME;
            
            var nodeInfo = podsPerNode[key];
            if(nodeInfo) {
                nodeInfo.count ++;
            } else {
                 nodeInfo = {};
                 nodeInfo.count = 1;
                 nodeInfo.left = 0;
            }
            podsPerNode[key] = nodeInfo;
        }
    });
    
    $.each(podsPerNode, function(n, c) {
        var nodeInfo = maxPodsPerNode[n];
        if(nodeInfo) {
            if(c.count > nodeInfo.count) {
                maxPodsPerNode[n] = c;
            }
        } else {
            maxPodsPerNode[n] = c;
        }
    });
}

var updateNodeGroups = function() {
    $.each(groups, groupNodeWithPodInfo);
}

var matchesByServiceSelector = function(labels, selector) {
    var match = false;
    if(selector) {
        var selectorKey = selector.entry[0].key + "_" + selector.entry[0].value;
        $.each(labels.entry, function(k, v) {
            var labelKey = v.key + "_" + v.value;   
            if(selectorKey == labelKey) {
                match = true;
            }
        });
    }
    
    return match;
}

var connectControllers = function() {
    connectUses();
    
    for (var i = 0; i < services.items.length; i++) {
        var service = services.items[i];
        for (var j = 0; j < pods.items.length; j++) {
            var pod = pods.items[j];
            if (matchesByServiceSelector(pod.metadata.labels, service.spec.selector)) {
                jsPlumb.connect(
                    {
                        source: 'service-' + service.metadata.name,
                        target: 'pod-' + pod.metadata.name,
                        anchors:["Bottom", "Top"],
                        paintStyle:{lineWidth:5,strokeStyle:'rgb(0,153,57)'},
                        endpointStyle:{ fillStyle: 'rgb(0,153,57)', radius: 7 },
                        connector:["Flowchart", { cornerRadius:5 }]});
            }
        }
    }
};

var colors = [
    'rgb(213,15,37)',
    'rgb(238,178,17)',
    'rgb(17,178,238)'
]

var connectUses = function() {
    var colorIx = 0;
    var keys = [];
    $.each(uses, function(key) {
        keys.push(key);
    });
    keys.sort(function(a, b) { return a > b; });
    $.each(keys, function(idx) {
        var key = keys[idx];
        var list = uses[key];
        var color = colors[colorIx];
        colorIx++;
        if (colorIx >= colors.length) { colorIx = 0;};
        $.each(pods.items, function(i, pod) {
        var podKey = pod.metadata.labels.name;
            if (podKey == key) {
                $.each(list, function(j, serviceId) {
                    jsPlumb.connect(
                    {
                        source: 'pod-' + pod.metadata.name,
                        target: 'service-' + serviceId,
                        endpoint: "Blank",
                        anchors:[[ 0.5, 1, 0, 1, -30, 0 ], "Top"],
                        connector: ["Bezier", { curviness:75 }],
                        paintStyle:{lineWidth:2,strokeStyle:color},
                        overlays:[
                            [ "Arrow", { width:15, length:30, location: 0.3}],
                            [ "Arrow", { width:15, length:30, location: 0.6}],
                            [ "Arrow", { width:15, length:30, location: 1}],
                        ],
                    });
                });
            }
        });
    });
};

var makeGroupOrder = function() {
    var groupScores = {};
    $.each(groups, function(key, val) {
        if (!groupScores[key]) {
          groupScores[key] = 0;
        }
        
        if (uses[key]) {
            value = uses[key];
            $.each(value, function(ix, uses_label) {
                if (!groupScores[uses_label]) {
                    groupScores[uses_label] = 1;
                } else {
                    groupScores[uses_label]++;
                }
            });
        } else {
            if (!groupScores["no-service"]) {
                groupScores["no-service"] = 1;
            } else {
                groupScores["no-service"]++;
            }
        }
    });
    var groupOrder = [];
    $.each(groupScores, function(key, value) {
        groupOrder.push(key);
    });
    groupOrder.sort(function(a, b) { return groupScores[a] - groupScores[b]; });

    return groupOrder;
};

var renderNodsWithNoPods = function() {
    var elt = $('.nodes');
    var y = 25;
    var x = 0;
    $.each(nodes.items, function(index, value) {
        if(!maxPodsPerNode[value.metadata.name]) {
            var div = $('<div/>');
            var ready = 'not_ready';
            $.each(value.status.conditions, function(index, condition) {
                if (condition.type === 'Ready') {
                    ready = (condition.status === 'True' ? 'ready' : 'not_ready' )
                }
            });
    
            var eltDiv = $('<div class="window node ' + ready + 
                                '"title="' + value.metadata.name + 
                                '"id="node-' + value.metadata.name + 
                                '"style="left: ' + (x + NODE_LEFT_MARGIN) + '; top: ' + y + '; width: ' + NODE_WIDTH_PER_POD + '"/>');
                eltDiv.html('<span><b>Node</b><br/><br/>' + 
                            value.metadata.name +
                            '</span>');
            div.append(eltDiv);          
            elt.append(div);
    
            x += NODE_WIDTH_PER_POD + NODE_PADDING;
        }
        
    });
}

var renderNodsWithPods = function() {
    var elt = $('#sheet');
    var y = 10;
    var x = 0;
    
    if(maxPodsPerNode[PENDING_POD_NODE_NAME]) {
        maxPodsPerNode[PENDING_POD_NODE_NAME].left = NODE_LEFT_MARGIN;
        x += NODE_WIDTH_PER_POD * maxPodsPerNode[PENDING_POD_NODE_NAME].count + NODE_PADDING;
    
    } 
        
    $.each(nodes.items, function(index, value) {
        if(maxPodsPerNode[value.metadata.name]) {
            var div = $('<div/>');
            var ready = 'not_ready';
            $.each(value.status.conditions, function(index, condition) {
                if (condition.type === 'Ready') {
                    ready = (condition.status === 'True' ? 'ready' : 'not_ready' )
                }
            });
        
            var width = NODE_WIDTH_PER_POD * (maxPodsPerNode[value.metadata.name] ? maxPodsPerNode[value.metadata.name].count : 1);
            var height = GROUP_HEIGHT * (Object.keys(groups).length) 
            var eltDiv = $('<div class="window node ' + ready + 
                            '"title="' + value.metadata.name + 
                            '"id="node-' + value.metadata.name + 
                            '"style="left: ' + (x + NODE_LEFT_MARGIN) + '; top: ' + y + '; width: ' + width + '; height:' + height + '; z-index: 0"/>');
            eltDiv.html('<span><b>Node: </b>' + value.metadata.name + '</span>');
            div.append(eltDiv);
        
            
            elt.append(div);
        
        
            maxPodsPerNode[value.metadata.name].left = x ;
            
            x += width + NODE_PADDING;
        }
    });
}

var renderGroups = function() {
    var elt = $('#sheet');
    var y = 10;
    var groupOrder = makeGroupOrder();
    var counts = {} 
   
    $.each(groupOrder, function(ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div/>');
        var copyMaxPodsPerNodes = $.extend(true, {}, maxPodsPerNode);
        $.each(list, function(index, value) {
            var eltDiv = null;
            var phase = value.status.phase ? value.status.phase.toLowerCase() : '';
            if (value.type == "pod") {
                if ('deletionTimestamp' in value.metadata) {
                  phase = 'terminating';
                }
                
                var podLeft;
                if(value.spec.nodeName) {
                    podLeft = copyMaxPodsPerNodes[value.spec.nodeName].left + NODE_LEFT_MARGIN + POD_LEFT_PADDING;
                    copyMaxPodsPerNodes[value.spec.nodeName].left += NODE_WIDTH_PER_POD;
                } else {
                    podLeft = copyMaxPodsPerNodes[PENDING_POD_NODE_NAME].left + POD_LEFT_PADDING;
                    copyMaxPodsPerNodes[PENDING_POD_NODE_NAME].left += NODE_WIDTH_PER_POD;
                }
                
                eltDiv = $('<div class="window pod ' + phase + '" title="' + value.metadata.name + '" id="pod-' + value.metadata.name +
                        '" style="left: ' + (podLeft) + '; top: ' + (y + POD_TOP_PADDING) + '"/>');
                eltDiv.html('<span>' + 
                value.metadata.name + "<br/><br/>" +
                "(" + (value.spec.nodeName ? truncate(value.spec.nodeName, 20, true) : "None")  +")" + "<br/><br/>" +
                '</span>');
                
                
            } else if (value.type == "service") {
                eltDiv = $('<div class="window wide service ' + phase + '" title="' + value.metadata.name + '" id="service-' + value.metadata.name +
                    '" style="left: ' + SERVICE_LEFT_PADDING + '; top: ' + y + '"/>');
                eltDiv.html('<span><a style="color:white; text-decoration: underline" href="http://' + 
                (value.status.loadBalancer && value.status.loadBalancer.ingress && value.status.loadBalancer.ingress.length > 0  ? value.status.loadBalancer.ingress[0].hostname : "#") + '">' +       
                value.metadata.name + '</a>' +
                (value.spec.type ? '<br/><br/>' + value.spec.type : "") +
                (value.spec.clusterIP ? '<br/><br/>(' + value.spec.clusterIP + ')': "") +
                '</span>');
            } 
            
            div.append(eltDiv);
        });
        y += GROUP_HEIGHT;
        elt.append(div);
    });
};

var insertUse = function(name, use) {
  for (var i = 0; i < uses[name].length; i++) {
    if (uses[name][i] == use) {
      return;
    }
  }
  uses[name].push(use);
};


var renderNamespaces = function() {
    $(".namespaces select").empty();  
    $.getJSON("/api/v1/namespaces", function( data ) {
        $.each(data.items, function(key, val) {
            $(".namespaces select").append("<option value='" + val.metadata.name + "'>" + val.metadata.name + "</option>");
        });
    });
}


var loadData = function() {
    var deferred = new $.Deferred();
    var namespace = $("#namespace").val();
    var podList = $.getJSON("/api/v1/pods?namespace=" + namespace, function( data ) {
        pods = data;
        $.each(data.items, function(key, val) {
            val.type = 'pod';
            if (val.metadata.labels && val.metadata.labels.uses) {
                var key = val.metadata.labels.name;
                if (!uses[key]) {
                     uses[key] = val.metadata.labels.uses.split("_");
                } else {
                    $.each(val.metadata.labels.uses.split("_"), function(ix, use) { insertUse(key, use); });
                }
             }
         });
    });

    var servicesList = $.getJSON("/api/v1/services?namespace=" + namespace, function( data ) {
        services = data;
        $.each(data.items, function(key, val) {
           val.type = 'service';      
        });
    });

    var nodeList = $.getJSON("/api/v1/nodes", function( data ) {
        nodes = data;
        $.each(data.items, function(key, val) {
            val.type = 'node';
        });
    });
    
    
    $.when(podList, servicesList, nodeList).then(function() {
        deferred.resolve();
    });

    return deferred;
}

function refresh(instance) {
    pods = [];
    services = [];
    nodes = [];
    uses = {};
    groups = {};
    groupsByNode = {};
    maxPodsPerNode = {};

    $.when(loadData()).then(function() {
        updateServiceGroups();
        updateNodeGroups();
        $('#sheet').empty();
        $('.nodes').empty();
        
        renderNodsWithNoPods();
        renderNodsWithPods();
        renderGroups();
        connectControllers();
        setTimeout(function() {
            refresh(instance);
        }, 10000);
    });
}

jsPlumb.bind("ready", function() {
    var instance = jsPlumb.getInstance({
        DragOptions : { cursor: 'pointer', zIndex:2000 },
        ConnectionOverlays : [
            [ "Arrow", { location:1 } ],
        ],
        Container:"flowchart-demo"
    });

    refresh(instance);
    jsPlumb.fire("jsPlumbDemoLoaded", instance);
});
