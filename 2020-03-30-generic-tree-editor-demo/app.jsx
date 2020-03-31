
window.EXAMPLE_TREE_DATA = {
  demo: JSON.parse("{\"AST\":{\"Module\":{\"body\":{\"FunctionDef\":{\"args\":{\"0\":{\"Name\":{\"id\":\"n\"}}},\"body\":{\"Assign\":{\"targets\":{\"0\":{\"Name\":{\"id\":\"base\"}}},\"value\":{\"Num\":{\"n\":\"1\"}}},\"For\":{\"body\":{\"0\":{\"Assign\":{\"targets\":{\"0\":{\"Name\":{\"id\":\"base\"}}},\"value\":{\"BinOp\":{\"left\":{\"Name\":{\"id\":\"base\"}},\"op\":\"Mult\",\"right\":{\"Name\":{\"id\":\"i\"}}}}}}},\"iter\":{\"iter\":{\"Call\":{\"args\":{\"0\":{\"Name\":{\"id\":\"n\"}},\"1\":{\"Num\":{\"n\":\"0\"}},\"2\":{\"Num\":{\"n\":\"-1\"}}},\"func\":{\"Name\":{\"id\":\"range\"}}}},\"target\":{\"id\":\"i\"}},\"target\":{\"id\":\"i\"}},\"Print\":{\"nl\":\"True\",\"values\":{\"0\":{\"Name\":{\"id\":\"base\"}}}}},\"name\":\"factorial\"}}}},\"Moscow metro stations\":{\"0\":{\"English transcription\":\"Bulvar Rokossovskogo\",\"Russian Cyrillic\":\"Бульвар Рокоссовского\",\"coordinates\":\"55.8148°N 37.7342°E\",\"elevation\":{\"meters\":\"-8\"},\"line\":\"1\",\"opened on\":\"1990-08-01\",\"transfer\":{\"0\":\"14\"},\"type\":{\"0\":\"column\",\"1\":\"triple-span\"}}},\"editing\":{\"list of projects\":{\"batiscaph\":{\"description\":\"Tracer with visual interface for Erlang\",\"url\":\"https://github.com/vladimir-vg/batiscaph\"},\"elk.erl\":{\"description\":\"Erlang implementation\\nof Mustache template engine\",\"url\":\"https://github.com/vladimir-vg/elk.erl\"}}},\"filesystem tree\":{\"etc\":{\"nginx\":{\"mime-types\":\"\\ntypes {\\n    text/html                             html htm shtml;\\n    text/css                              css;\\n    text/xml                              xml;\\n    image/gif                             gif;\\n    image/jpeg                            jpeg jpg;\\n    application/javascript                js;\\n    application/atom+xml                  atom;\\n    application/rss+xml                   rss;\\n\\n...\",\"nginx.conf\":\"user www-data;\\nworker_processes auto;\\npid /run/nginx.pid;\\ninclude /etc/nginx/modules-enabled/*.conf;\\n\\nevents {\\n\\tworker_connections 768;\\n\\t# multi_accept on;\\n}\\n\\nhttp {\\n\\n\\t##\\n\\t# Basic Settings\\n\\t##\\n...\",\"sites-available\":{\"default\":\"##\\n# You should look at the following URL's in order to grasp a solid understanding\\n# of Nginx configuration files in order to fully unleash the power of Nginx.\\n# https://www.nginx.com/resources/wiki/start/\\n# https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/\\n# https://wiki.debian.org/Nginx/DirectoryStructure\\n#\\n# In most cases, administrators will remove this file from sites-enabled/ and\\n# leave it as reference inside of sites-available where it will continue to be\\n# updated by the nginx packaging team.\\n#\\n# This file will automatically load configuration files provided by other\\n# applications, such as Drupal or Wordpress. These applications will be made\\n# available underneath a path with that package name, such as /drupal8.\\n#\\n# Please see /usr/share/doc/nginx-doc/examples/ for more detailed examples.\\n##\\n\\n...\"}}}},\"intro\":{\"author\":{\"email\":\"gordeev.vladimir.v@gmail.com\",\"name\":\"Vladimir Gordeev\"},\"recorded on\":\"30 March 2020\",\"subject\":\"Generic tree editor demo\"}}")
};

const { BrowserRouter, Route } = ReactRouterDOM;



class App extends React.Component {
  constructor() {
    super();
    // repo storage contains data that user works on
    // user storage contains data that is personal to user, and not supposed to get into shared repo
    // such data includes unsaved data here and there, order of keys that user had used
    this._storage = new Storage({ objectPrefix: "" });
    this._projectRepo = this._storage.repo({ toplevelPrefix: "toplevel_" });
    this._userRepo = this._storage.repo({ toplevelPrefix: "user_toplevel_" });
    window.AppStorage = this._storage;
    // this._projectRepo.storeJSONObject(EXAMPLE_TREE_DATA);
  }

  render() {
    // to avoid rerenders: https://reactjs.org/docs/context.html#caveats
    this._contextValue = this._contextValue || { projectRepo: this._projectRepo, userRepo: this._userRepo };

    return <StorageContext.Provider value={this._contextValue}>
      <Route path="/node/:path*" component={TreeEditor} />
    </StorageContext.Provider>;
  }
}

setTimeout(() => {
  const app = <BrowserRouter>
    <Route path="/" component={App} />
  </BrowserRouter>;

  ReactDOM.render(app, document.getElementById("react-app"));
}, 100);
