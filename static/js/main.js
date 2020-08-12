const { Component } = window.Torus;
const html = window.jdom;

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Random page number for "Continued on Page..."
function R() {
  const MAX_PAGE = 30;
  return ~~(Math.random() * MAX_PAGE);
}

const debounce = (fn, delayMillis) => {
  let lastRun = 0;
  let to = null;
  return (...args) => {
    clearTimeout(to);
    const now = Date.now();
    const dfn = () => {
      lastRun = now;
      fn(...args);
    };
    if (now - lastRun > delayMillis) {
      dfn();
    } else {
      to = setTimeout(dfn, delayMillis);
    }
  };
};

function formatRelativeDate(timestamp) {
  if (!timestamp) {
    return "some time ago";
  }

  const date = new Date(timestamp * 1000);
  const delta = (Date.now() - date) / 1000;
  if (delta < 60) {
    return "< 1 min ago";
  } else if (delta < 3600) {
    return `${~~(delta / 60)} min ago`;
  } else if (delta < 86400) {
    return `${~~(delta / 3600)} hrs ago`;
  } else if (delta < 86400 * 2) {
    return "yesterday";
  } else if (delta < 86400 * 3) {
    return "2 days ago";
  } else {
    return date.toLocaleDateString();
  }
}

// for header top bar
function formatDate() {
  const date = new Date();
  return `${DAYS[date.getDay()]}, ${
    MONTHS[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

function decodeHTMLEntities(s) {
  const txt = document.createElement("textarea");
  txt.innerHTML = s;
  return txt.textContent;
}

// fetch and normalize stories from a subreddit's "hot" section
async function fetchStories() {
  const resp = await fetch(
    `https://vanderbilthustler.com/wp-json/wp/v2/posts?per_page=25&_fields=date,title,excerpt,link,featured_media,custom_fields.writer`
  )
    .then((r) => r.json())
    .catch((e) => console.log(e));
  const posts = resp[0];

  return posts;
}

async function fetchStoryImage(id) {
  const resp = await fetch(`https://vanderbilthustler.com/wp-json/wp/v2/media/${id}?_fields=guid`)
    .then((r) => r.json())
    .catch((e) => console.log(e));
  const link = resp.guid.rendered;

  return link;
}

function StoryBody(created, text) {
  if (!text) {
    text = `Lorem ipsum dolor sit amet, ei mel cibo meliore instructior, eam te etiam clita. Id falli facilis intellegam his, eu populo dolorem offendit eam. Noster nemore luptatum ex sit. Ei sea melius definitiones.`;
  }

  const words = text.split(" ");
  if (words.length > 100) {
    return [
      html`<p>
        ${formatRelativeDate(created)}–${words.slice(0, 100).join(" ")} ...
      </p>`,
      html`<p class="continued><em>Continued on Page A${R()}</em></p>`,
    ];
  }

  return html`<p>${formatRelativeDate(created)}–${text}</p>`;
}

// All stories that appear have the same DOM structure, displayed
// differently with CSS. This renders such a single story.
function Story(story) {
  if (!story) {
    return null;
  }

  const {
    title,
    custom_fields,
    link,
    excerpt,
    featured_media,
    date,
  } = story;
  return html`<div class="story">
    <a href="${link}" target="_blank>
      <h2 class="story-title">
        ${title}
      </h2>
    </a>
    <div class="story-byline">
      By
      <span class="story-author">${custom_fields.writer}</span>
    </div>
    <a href="${link}" target="_blank">
      <img class="story-image" src="${fetchStoryImage(featured_media)}" />
      <div class="story-content">${StoryBody(date, excerpt)}</div>
    </a>
  </div>`;
}

class App extends Component {
  init() {
    this.stories = [];
    this._loading = false;

    this.resize = debounce(this.resize.bind(this), 500);
    window.addEventListener("resize", this.resize);

    this.fetch();
  }
  resize() {
    this.render();
  }
  async fetch() {
    this._loading = true;
    this.render();

    this.stories = await fetchStories()

    this._loading = false;
    this.render();
  }
  compose() {
    const stories = this.stories.slice();

    const centerSpreads = stories.slice(0, 2);
    const leftSidebar = stories.slice(2, 6);
    const sidebarSpread = stories.slice(6, 9);
    const bottom = stories.slice(9, 12);
    const mini = stories.slice(12, 16);
    const mini2 = stories.slice(16, 21);
    const mini3 = stories.slice(21, 25);

    // Instead of having a responsive layout that wrecks the newspaper
    // feel, if the window is too small, we simply scale the entire
    // front page down appropriately. Here we compute that ratio
    // to leave a 2% margin on either side for visual comfort.
    const scale = Math.min((window.innerWidth / 1200) * 0.96, 1);

    const storiesSection = [
      html`<div class="main flex-row">
        <div class="left-sidebar flex-column smaller">
          ${leftSidebar.map(Story)}
        </div>
        <div class="spreads flex-column">
          <div class="top flex-row">
            <div class="center-spread">
              ${centerSpreads.map(Story)}
            </div>
            <div class="sidebar sidebar-spread flex-column smaller">
              ${sidebarSpread.map(Story)}
            </div>
          </div>
          <div class="bottom flex-row">${bottom.map(Story)}</div>
        </div>
      </div>`,
      html`<div class="mini flex-row smaller">${mini.map(Story)}</div>`,
      html`<div class="mini flex-row smaller">${mini2.map(Story)}</div>`,
      html`<div class="mini flex-row smaller">${mini3.map(Story)}</div>`,
    ];

    return html`<div
      class="app flex-column"
      style="transform: scale(${scale}) translate(-50%, 0)"
    >
      <header class="flex-column">
        <div class="header-main flex-row">
          <div class="header-tagline header-main-aside">
            "All the Reddit <br />
            That's Fit to Uwu"
          </div>
          <a href="/" class="masthead-link">
            <h1 class="fraktur masthead">The Vanderbilt Hustler</h1>
          </a>
          <div class="header-edition header-main-aside">
            <div class="header-edition-title">The Classic Edition</div>
            <p class="header-edition-body justify">
              <strong>The Unim.press</strong> is a Reddit reader in the style of
              a certain well-known metropolitan newspaper. You're currently
              reading
              ${this.allTime ? "all-time top posts of " : ""}/r/${this
                .subreddit}.
              The Unim.press is built by
              <strong
                ><a target="_blank" href="https://thesephist.com"
                  >Aadi Bajpai</a
                ></strong
              >
              and open-source on GitHub at
              <a target="_blank" href="https://github.com/thesephist/unim.press"
                >thesephist/unim.press</a
              >.
            </p>
          </div>
        </div>
        <div class="header-bar flex-row">
          <div class="header-vol bar-aside">VOL. CLXX . . . No. 3.14159</div>
          <div class="header-nyc">Nashville, ${formatDate()}</div>
          <div class="header-controls bar-aside flex-row">
          </div>
        </div>
      </header>
      ${this._loading
        ? html`<div class="loading">Loading stories...</div>`
        : storiesSection}
      <footer>
        <p>
          The Unim.press is a project by
          <a target="_blank" href="https://thesephist.com">@thesephist</a>. It's
          built with
          <a target="_blank" href="https://github.com/thesephist/torus"
            >Torus</a
          >
          and open source on GitHub at
          <a target="_blank" href="https://github.com/thesephist/unim.press"
            >thesephist/unim.press</a
          >.
        </p>
      </footer>
    </div>`;
  }
  render(...args) {
    super.render(...args);

    // Simplest way to keep the "selected" value of the subreddit
    // selector in check is to just set it after render.
    this.node.querySelector("select").value = this.subreddit;
  }
}

const app = new App();
document.body.appendChild(app.node);
