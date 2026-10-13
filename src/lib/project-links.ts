type ProjectLinkSource = {
  project?: string;
  projectLabel?: string;
};

export function projectLinkForSlide(slide: ProjectLinkSource, projectBase = '/photography/') {
  const defaultProjectLabel = 'View project →';
  const href = slide.project ? `${projectBase}${slide.project}/` : undefined;

  return {
    href,
    hidden: !href,
    label: slide.projectLabel?.trim() || defaultProjectLabel,
  };
}
