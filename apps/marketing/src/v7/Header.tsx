import { SiteHeader } from '@axp/design-system/prospectus';
import { HEADER, NAV, PRODUCT_VIDEO_URL } from '@/data/copy';
import s from './header.module.css';

export default function Header() {
  return <div className={s.header}><SiteHeader links={NAV} cta={{href: PRODUCT_VIDEO_URL, label: HEADER.cta}} chip="" /></div>;
}
