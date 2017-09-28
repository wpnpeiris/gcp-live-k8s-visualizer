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
var controllers = [];
var uses = {};

var groups = {};

var insertByServiceSelector = function(index, value) {
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

var insertByLabel = function(index, value) {
    $.each(value.metadata.labels.entry, function(k, v) {
        var key = v.key + "_" + v.value;
        if(groups[key]) {
            groups[key].push(value);
        }
    });
}

var groupByService = function() {
    $.each(services.items, insertByServiceSelector);
    $.each(pods.items, insertByLabel);
    
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
         //console.log('connect uses key: ' +key + ', ' + podKey);
            if (podKey == key) {
                $.each(list, function(j, serviceId) {
          //console.log('connect: ' + 'pod-' + pod.metadata.name + ' to service-' + serviceId);
                    jsPlumb.connect(
                    {
                        source: 'pod-' + pod.metadata.name,
                        target: 'service-' + serviceId,
                        endpoint: "Blank",
                        //anchors:["Bottom", "Top"],
            anchors:[[ 0.5, 1, 0, 1, -30, 0 ], "Top"],
                        //connector: "Straight",
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
    //console.log("group key: " + key);
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

    //console.log(groupOrder);
  return groupOrder;
};

var renderNodes = function() {
    var y = 25;
    var x = 100;
    $.each(nodes.items, function(index, value) {
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
                            '"style="left: ' + (x + 250) + '; top: ' + y + '"/>');
            eltDiv.html('<span><b>Node</b><br/><br/>' + 
                        truncate(value.metadata.name, 6) +
                        '</span>');
        div.append(eltDiv);

        var elt = $('.nodesbar');
        elt.append(div);

        x += 120;
    });
}

var renderGroups = function() {
    var elt = $('#sheet');
    var y = 10;
    var serviceLeft = 0;
    var groupOrder = makeGroupOrder();
    var counts = {} 
    $.each(groupOrder, function(ix, key) {
        list = groups[key];
        if (!list) {
            return;
        }
        var div = $('<div/>');
        var x = 100;
        $.each(list, function(index, value) {
            var eltDiv = null;
            var phase = value.status.phase ? value.status.phase.toLowerCase() : '';
            if (value.type == "pod") {
                if ('deletionTimestamp' in value.metadata) {
                  phase = 'terminating';
                }
                eltDiv = $('<div class="window pod ' + phase + '" title="' + value.metadata.name + '" id="pod-' + value.metadata.name +
                    '" style="left: ' + (x + 250) + '; top: ' + (y + 160) + '"/>');
                eltDiv.html('<span>' + 
                value.metadata.name + "<br/><br/>" +
                "(" + (value.spec.nodeName ? truncate(value.spec.nodeName, 20, true) : "None")  +")" + "<br/><br/>" +
                '</span>');
            } else if (value.type == "service") {
                eltDiv = $('<div class="window wide service ' + phase + '" title="' + value.metadata.name + '" id="service-' + value.metadata.name +
                    '" style="left: ' + 75 + '; top: ' + y + '"/>');
                eltDiv.html('<span><a style="color:white; text-decoration: underline" href="http://' + 
                (value.status.loadBalancer && value.status.loadBalancer.ingress && value.status.loadBalancer.ingress.length > 0  ? value.status.loadBalancer.ingress[0].hostname : "#") + '">' +       
                value.metadata.name + '</a>' +
                (value.spec.type ? '<br/><br/>' + value.spec.type : "") +
                (value.spec.clusterIP ? '<br/><br/>(' + value.spec.clusterIP + ')': "") +
                '</span>');
            } else {
                var key = 'controller-' + value.metadata.labels.name;
                counts[key] = key in counts ? counts[key] + 1 : 0;
                
                var minLeft = 900;
                var calcLeft = 400 + (value.status.replicas * 130);
                var left = minLeft > calcLeft ? minLeft : calcLeft;
                eltDiv = $('<div class="window wide controller" title="' + value.metadata.name + '" id="controller-' + value.metadata.name +
                    '" style="left: ' + (left + counts[key] * 100) + '; top: ' + (y + 100 + counts[key] * 100) + '"/>');
                eltDiv.html('<span>' + 
                value.metadata.name +
                (value.metadata.labels.version ? "<br/><br/>" + value.metadata.labels.version : "") + 
                '</span>');
            }
            div.append(eltDiv);
            x += 210;
        });
        y += 400;
        serviceLeft += 200;
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

var loadData = function() {
    var deferred = new $.Deferred();
    var podList = $.getJSON("/api/v1/pods", function( data ) {
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

    var rcList = $.getJSON("/api/v1/replicationcontrollers", function( data ) {
        controllers = data;
        $.each(data.items, function(key, val) {
            val.type = 'replicationController';
        });
    });


    var servicesList = $.getJSON("/api/v1/services", function( data ) {
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

    $.when(podList, rcList, servicesList, nodeList).then(function() {
        deferred.resolve();
    });

    return deferred;
}

function refresh(instance) {
    pods = [];
    services = [];
    controllers = [];
    nodes = [];
    uses = {};
    groups = {};


    $.when(loadData()).then(function() {
        groupByService();
        $('#sheet').empty();
        renderNodes();
        renderGroups();
        connectControllers();
        setTimeout(function() {
            refresh(instance);
        }, 2000);
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
