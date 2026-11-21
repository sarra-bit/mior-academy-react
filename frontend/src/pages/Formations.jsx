import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { deptInfo, formatPrix } from '../utils/format.js';

export default function Formations() {
  const [params, setParams] = useSearchParams();
  const departement = params.get('departement') || '';
  const categorie = params.get('categorie') || '';
  const q = params.get('q') || '';

  const [departements, setDepartements] = useState([]);
  const [formations, setFormations] = useState([]);
  const [search, setSearch] = useState(q);
  const [state, setState] = useState('loading');

  useEffect(() => {
    api.categories().then(setDepartements).catch(() => {});
  }, []);

  useEffect(() => {
    setState('loading');
    api.formations({ departement, categorie, q })
      .then((data) => { setFormations(data); setState('ready'); })
      .catch(() => setState('error'));
  }, [departement, categorie, q]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const categoriesDuDept = departements.find((d) => d.nom === departement)?.categories || [];

  return (
    <section className="block page">
      <div className="section-head">
        <span className="eyebrow">Catalogue</span>
        <h1 className="section-title">Nos formations</h1>
        <p className="section-subtitle">Filtrez par département ou recherchez une formation précise.</p>
      </div>

      <div className="filters">
        <form
          className="search"
          onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}
        >
          <input
            type="search"
            placeholder="Rechercher une formation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une formation"
          />
          <button className="btn btn-primary" type="submit">Rechercher</button>
        </form>

        <div className="chips">
          <button className={`chip ${!departement ? 'active' : ''}`} onClick={() => update({ departement: '', categorie: '' })}>
            Tous
          </button>
          {departements.map((d) => (
            <button
              key={d.nom}
              className={`chip ${departement === d.nom ? 'active' : ''}`}
              onClick={() => update({ departement: d.nom, categorie: '' })}
            >
              {deptInfo(d.nom).icon} {d.nom} <span className="chip-count">{d.total}</span>
            </button>
          ))}
        </div>

        {categoriesDuDept.length > 1 && (
          <div className="chips chips-sub">
            <button className={`chip chip-sm ${!categorie ? 'active' : ''}`} onClick={() => update({ categorie: '' })}>
              Toutes les catégories
            </button>
            {categoriesDuDept.map((c) => (
              <button
                key={c.nom}
                className={`chip chip-sm ${categorie === c.nom ? 'active' : ''}`}
                onClick={() => update({ categorie: c.nom })}
              >
                {c.nom} <span className="chip-count">{c.total}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {state === 'loading' && <div className="page-state">Chargement des formations…</div>}
      {state === 'error' && <div className="alert alert-error">Impossible de charger les formations. Le serveur est-il démarré ?</div>}
      {state === 'ready' && formations.length === 0 && <div className="page-state">Aucune formation ne correspond à votre recherche.</div>}

      {state === 'ready' && formations.length > 0 && (
        <>
          <p className="result-count">{formations.length} formation{formations.length > 1 ? 's' : ''}</p>
          <div className="formation-grid">
            {formations.map((f) => (
              <Link key={f.id} to={`/formations/${f.id}`} className="formation-card">
                <div className="formation-card-top">
                  <span className={`tag tone-${deptInfo(f.departement).tone}`}>
                    {deptInfo(f.departement).icon} {f.categorie || f.departement}
                  </span>
                  {f.sessions_a_venir > 0 && <span className="tag tag-live">Session à venir</span>}
                </div>
                <h3>{f.titre}</h3>
                <p>{f.description ? f.description.slice(0, 120) + (f.description.length > 120 ? '…' : '') : 'Description à venir.'}</p>
                <div className="formation-meta">
                  <span>⏱ {f.duree ? `${f.duree} h` : '—'}</span>
                  <strong>{formatPrix(f.prix)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
