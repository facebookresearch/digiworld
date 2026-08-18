const icons = {
  back: require('./back.png'),
  bell: require('./bell.png'),
  caretLeft: require('./caretLeft.png'),
  caretRight: require('./caretRight.png'),
  check: require('./check.png'),
  hidden: require('./hidden.png'),
  ladybug: require('./ladybug.png'),
  lock: require('./lock.png'),
  menu: require('./menu.png'),
  more: require('./more.png'),
  settings: require('./settings.png'),
  view: require('./view.png'),
  x: require('./x.png'),
  scan: require('./scan.png'),
  // Add more as needed, or automate for all files
}

export default icons
export type IconName = keyof typeof icons
