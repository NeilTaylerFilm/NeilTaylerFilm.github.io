export function bindArticleCitations(body: HTMLElement) {
  // Cleans up broken citation icons: if an external website's favicon fails to load, hide it neatly.
  const bindCitationIcons = (root: ParentNode) => {
    for (const icon of root.querySelectorAll<HTMLImageElement>('img[data-citation-icon]')) {
      const hideBrokenIcon = () => (icon.hidden = true);
      if (icon.complete && !icon.naturalWidth) hideBrokenIcon();
      icon.addEventListener('error', hideBrokenIcon, { once: true });
    }
  };
  bindCitationIcons(body);

  // Citation bundling: When an author cites 3 or more sources in a row, group them into a compact dropdown.
  const citationRuns: { parent: Node; nodes: Node[]; links: HTMLAnchorElement[] }[] = [];
  const isCitation = (node: Node) =>
    node instanceof HTMLAnchorElement && node.matches('a[title="cite"]');
  const isWhitespace = (node: Node) =>
    node.nodeType === Node.TEXT_NODE && !node.textContent?.trim();
  // Read the original paragraph nodes first; only adjacent citation links belong in one group.
  for (const paragraph of body.querySelectorAll('p')) {
    const nodes = [...paragraph.childNodes];
    for (let index = 0; index < nodes.length;) {
      if (!isCitation(nodes[index])) {
        index++;
        continue;
      }
      const links = [nodes[index] as HTMLAnchorElement];
      let end = index + 1;
      while (end + 1 < nodes.length && isWhitespace(nodes[end]) && isCitation(nodes[end + 1])) {
        links.push(nodes[end + 1] as HTMLAnchorElement);
        end += 2;
      }
      if (links.length >= 3)
        citationRuns.push({ parent: paragraph, nodes: nodes.slice(index, end), links });
      index = end;
    }
  }
  const groups: HTMLDetailsElement[] = [];
  // Wrap later groups first so earlier groups in the same paragraph stay in place.
  for (const run of citationRuns.reverse()) {
    const cluster = document.createElement('span');
    cluster.className = 'citation-cluster';
    const disclosure = document.createElement('details');
    disclosure.className = 'citation-more';
    disclosure.name = 'citation-sources';
    const summary = document.createElement('summary');
    const count = document.createElement('span');
    count.className = 'citation-count';
    count.textContent = `+${run.links.length - 1}`;
    for (const child of [...run.links[0].childNodes]) summary.append(child.cloneNode(true));
    summary.append(count);
    summary.setAttribute('aria-label', `View all ${run.links.length} cited sources`);
    const list = document.createElement('ul');
    list.className = 'citation-source-list';
    list.setAttribute('aria-label', 'All cited sources');
    for (const link of run.links) {
      const item = document.createElement('li');
      const source = link.cloneNode(true) as HTMLAnchorElement;
      item.append(source);
      list.append(item);
    }
    summary.addEventListener('click', () => {
      list.removeAttribute('data-positioned');
      requestAnimationFrame(() => {
        if (!disclosure.open) return;
        const anchor = summary.getBoundingClientRect();
        const width = list.getBoundingClientRect().width;
        const left = Math.max(16, Math.min(anchor.left, innerWidth - width - 16));
        const height = list.getBoundingClientRect().height;
        let top = anchor.bottom + 6;
        if (top + height > innerHeight - 16) top = Math.max(16, anchor.top - height - 6);
        list.style.left = `${left}px`;
        list.style.top = `${top}px`;
        list.setAttribute('data-positioned', '');
      });
    });
    disclosure.append(summary, list);
    bindCitationIcons(summary);
    bindCitationIcons(list);
    run.parent.insertBefore(cluster, run.nodes[0]);
    run.nodes.forEach((node) => node.parentNode?.removeChild(node));
    cluster.append(disclosure);
    groups.push(disclosure);
  }
  // Closes any open citation popover when the visitor presses the Escape key.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = groups.find((details) => details.open);
    if (!open) return;
    open.open = false;
    open.querySelector('summary')?.focus();
  });
  // Closes citation popovers if the visitor taps outside of them.
  document.addEventListener('pointerdown', (event) => {
    const target = event.target;
    for (const details of groups)
      if (details.open && target instanceof Node && !details.contains(target)) details.open = false;
  });
  window.addEventListener('scroll', () => groups.forEach((details) => (details.open = false)), {
    passive: true,
  });
  window.addEventListener('resize', () => groups.forEach((details) => (details.open = false)));
}
