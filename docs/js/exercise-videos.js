(function () {
  "use strict";

  var PAGE_SIZE = 10;

  function activateVideo(button) {
    var videoId = button.dataset.videoId;
    var title = button.dataset.videoTitle || "YouTube video";
    var language = document.documentElement.lang === "ja" ? "ja" : "en";

    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) {
      return;
    }

    var iframe = document.createElement("iframe");
    iframe.className = "youtube-video-frame";
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(videoId) +
      "?autoplay=1&playsinline=1&hl=" +
      language;
    iframe.title = title;
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;

    button.replaceWith(iframe);
  }

  function initializeGallery(gallery) {
    var items = Array.prototype.slice.call(gallery.querySelectorAll(".youtube-video-item"));
    var moreButton = gallery.parentElement.querySelector(".youtube-video-more");
    var searchMoreLink = gallery.parentElement.querySelector(".youtube-video-search-more");
    var visibleCount = Math.min(PAGE_SIZE, items.length);

    function updateVisibility() {
      items.forEach(function (item, index) {
        item.hidden = index >= visibleCount;
      });

      if (moreButton) {
        moreButton.hidden = visibleCount >= items.length;
        moreButton.setAttribute("aria-expanded", visibleCount >= items.length ? "true" : "false");
      }

      if (searchMoreLink) {
        searchMoreLink.hidden = visibleCount < items.length;
      }
    }

    gallery.addEventListener("click", function (event) {
      var playButton = event.target.closest(".youtube-video-play");
      if (playButton && gallery.contains(playButton)) {
        activateVideo(playButton);
      }
    });

    if (moreButton) {
      moreButton.addEventListener("click", function () {
        var firstNewItem = items[visibleCount];
        visibleCount = Math.min(visibleCount + PAGE_SIZE, items.length);
        updateVisibility();
        if (firstNewItem) {
          firstNewItem.querySelector(".youtube-video-play").focus();
        }
      });
    }

    updateVisibility();
  }

  document.querySelectorAll(".youtube-video-grid").forEach(initializeGallery);
})();
