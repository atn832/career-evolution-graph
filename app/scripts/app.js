/** @jsx React.DOM */

var React = window.React = require('react'),
    Timer = require("./ui/Timer"),
    request = require("superagent"),
    mountNode = document.getElementById("app");

var TodoList = React.createClass({
  render: function() {
    var createItem = function(itemText) {
      return <li>{itemText}</li>;
    };
    return <ul>{this.props.items.map(createItem)}</ul>;
  }
});

function requestJobEvolution(jobTitle) {
  return new Promise(function(resolve, reject) {
    request
      .get("https://jsonp.nodejitsu.com/")
      .query({
        url: "http://api.glassdoor.com/api/api.htm?t.p=31642&t.k=0bNITwCyIE&userip=0.0.0.0&useragent=&format=json&v=1&action=jobs-prog&countryId=1&jobTitle=" + jobTitle
      })
      .end(function(err,res){
          if (!err && res.ok) {
            resolve(JSON.parse(res.text));
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
    this.setState({
      jobs: jobs
    });
    // request more
    if (depth < 2) {
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
    requestJobEvolution("software developer").then(this.updateJobs.bind(this, 1));

    return {
      items: [],
      text: '',
      jobs: {}
    };
  },
  onChange: function(e) {
    this.set
    State({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var nextItems = this.state.items.concat([this.state.text]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});
  },
  render: function() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
          <input onChange={this.onChange} value={this.state.text} />
          <button>{'Add #' + (this.state.items.length + 1)}</button>
        </form>
        <Timer />
        <div ref="container" className="graph">container</div>
      </div>
    );
  },
  updateGraph: function() {
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
          label: jobTitle
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
          label: nextJobTitle,
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
        edges.push({
          from: jobTitle,
          to: nextJob.nextJobTitle
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
  },
  componentDidMount: function() {
    this.updateGraph();
  },
  componentDidUpdate: function() {
    this.updateGraph();
  }
});


React.render(<TodoApp />, mountNode);

