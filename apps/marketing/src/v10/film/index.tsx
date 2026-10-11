// 02 One question. The centrepiece: one question followed from the moment it is asked, as a
// scroll-driven film in five beats and a coda. The stage (client) is server-rendered in its still
// form first, so every caption and all story text is in the HTML.
import { Chapter } from "../kit";
import { FILM } from "../copy";
import FilmStage from "./FilmStage";
import s from "./film.module.css";

export default function Film() {
  return (
    <Chapter id="question" no={FILM.no} title={FILM.title} labelledBy="film-h" className={s.film}>
      <div className={`x-wrap ${s.head}`}>
        <h2 id="film-h" className="x-h1">{FILM.h}</h2>
      </div>
      <FilmStage />
    </Chapter>
  );
}
