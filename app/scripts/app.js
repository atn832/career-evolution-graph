/** @jsx React.DOM */

var React = window.React = require('react'),
    Timer = require("./ui/Timer"),
    request = require("superagent"),
    mountNode = document.getElementById("app");
var Colors = {
    Green: "#009688",
    Red: "#F44336"
}

var TodoList = React.createClass({
  render: function() {
      var createItem = function(itemText) {
          return <li>
            {itemText}
            <button onClick={this.props.onRemove.bind(this, itemText)} type="button" className="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          </li>;
      };
      return <ul>{this.props.items.map(createItem.bind(this))}</ul>;
  }
});

function requestJobEvolution(jobTitle) {
    return new Promise(function(resolve, reject) {
        request
            .get("http://m.wafrat.com:8081/gd/api.htm?t.p=31642&t.k=0bNITwCyIE&userip=0.0.0.0&useragent=&format=json&v=1&action=jobs-prog&countryId=1&jobTitle=" + jobTitle.toLowerCase())
            .end(function(err,res){
                if (!err && res.ok) {
                    var obj = JSON.parse(res.text);
                    if (obj.success) {
                        resolve(obj);
                    }
                    else {
                        reject("Request failed: " + obj.status);
                    }
                }
                else {
                    reject("Request failed:" + err);
                }
            });
    });
}

var TodoApp = React.createClass({
    updateJobs: function(depth, jobResult) {
        var jobs = this.state.jobs;
        jobs[jobResult.response.jobTitle] = jobResult.response;
        this.graphInvalidated = true;
        this.setState({
            jobs: jobs
        });
        // request more
        if (depth < 1) {
            Object.keys(jobs).forEach(function(jobTitle) {
                var job = jobs[jobTitle];
                job.results.forEach(function(nextJob) {
                    if (!jobs[nextJob]) {
                        requestJobEvolution(nextJob.nextJobTitle).then(this.updateJobs.bind(this, depth + 1));
                    }
                }.bind(this));
            }.bind(this));
        }
    },
    getInitialState: function() {
        return {
            items: [],
            text: '',
            jobs: {}
        };
    },
    onChange: function(e) {
        this.setState({text: e.target.value});
    },
    handleSubmit: function(e) {
        if (e) {
            e.preventDefault();
        }
        var nextItems = this.state.items.concat([this.state.text]);
        requestJobEvolution(this.state.text).then(this.updateJobs.bind(this, 1), function(err) {
            alert("Request failed. Hourly quota reached?");
        });
        var nextText = '';
        this.setState({items: nextItems, text: nextText});
    },
    remove: function(job) {
        var items = this.state.items;
        items.splice(items.indexOf(job), 1);
        this.graphInvalidated = true;
        var jobs = this.state.jobs;
        delete jobs[job];
        this.setState({
            items: items,
            jobs: jobs
        });
    },
    render: function() {
        return (
            <div>
                <p>
                    <TodoList items={this.state.items} onRemove={this.remove}/>
                    <form onSubmit={this.handleSubmit}>
                        <input onChange={this.onChange} value={this.state.text} />
                        <button>{'Add #' + (this.state.items.length + 1)}</button>
                    </form>
                </p>
                <div ref="container" className="graph jumbotron">container</div>
            </div>
        );
    },
    updateGraph: function() {
        if (!this.graphInvalidated) {
            return;
        }
        this.graphInvalidated = false;

        var container = this.refs.container.getDOMNode();
        if (!container)
            return;

        // create an array with nodes
        var nodes = [];

        // create an array with edges
        var edges = [];

        var nodeAdded = {};

        // populate nodes
        Object.keys(this.state.jobs).forEach(function(jobTitle) {
            var job = this.state.jobs[jobTitle];
            if (!nodeAdded[jobTitle]) {
                var node = {
                    id: jobTitle,
                    label: jobTitle + " ($" + Math.round(job.payMedian / 1000) + "K)",
                };
                nodes.push(node);
                nodeAdded[jobTitle] = node;
            }

            var job = this.state.jobs[jobTitle];
            job.results.forEach(function(nextJob) {
                var nextJobTitle = nextJob.nextJobTitle;
                var node;
                if (nodeAdded[nextJobTitle]) {
                    nodeAdded[nextJobTitle].value = nextJob.nationalJobCount;
                    return;
                }
                node = {
                    id: nextJobTitle,
                    label: nextJobTitle + " ($" + Math.round(nextJob.medianSalary / 1000) + "K)",
                    value: nextJob.nationalJobCount
                };
                nodes.push(node);
                nodeAdded[nextJobTitle] = node;
            });
        }.bind(this));

        // populate edges
        Object.keys(this.state.jobs).forEach(function(jobTitle) {
            var job = this.state.jobs[jobTitle];
            job.results.forEach(function(nextJob) {
                var payRaise = job.payMedian < nextJob.medianSalary;
                // only render career progress
                // if (job.payMedian > nextJob.medianSalary)
                //   return;

                edges.push({
                    from: jobTitle,
                    to: nextJob.nextJobTitle,
                    value: nextJob.frequencyPercent, // absolute numbers
                    color: payRaise? Colors.Green: Colors.Red
                });
            });
        }.bind(this));

        // create a network
        var data= {
            nodes: nodes,
            edges: edges,
        };
        var options = {
            width: '100%',
            height: '100%',
            nodes: {
                shape: 'dot'
            }
        };
        var network = new vis.Network(container, data, options);

        network.on("click", function(data) {
              data.nodes.forEach(function(node) {
                this.setState({
                    text: node
                });
                this.handleSubmit();
            }.bind(this));
        }.bind(this));
    },
    componentDidMount: function() {
        this.updateGraph();
    },
    componentDidUpdate: function() {
        this.updateGraph();
    }
});


React.render(<TodoApp />, mountNode);

