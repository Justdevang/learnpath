import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, ChevronDown } from 'lucide-react';
import '../styles/glossary.css';

export function Glossary() {
  const [terms, setTerms] = useState([]);
  const [filteredTerms, setFilteredTerms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLetter, setSelectedLetter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTerm, setExpandedTerm] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const categories = [
    'All',
    'DevOps',
    'Microservices',
    'Databases',
    'Security',
    'Programming',
    'Frameworks',
    'Cloud',
    'Architecture',
    'Performance',
    'Other'
  ];

  const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  useEffect(() => {
    fetchGlossary();
  }, []);

  const fetchGlossary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/glossary?limit=1000`);
      
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a few minutes.');
        }
        throw new Error(data.error || data.details || 'Failed to fetch glossary');
      }

      if (!data.terms || data.terms.length === 0) {
        setError('No glossary terms found. The database might be empty.');
        setTerms([]);
        setFilteredTerms([]);
      } else {
        setTerms(data.terms);
        setFilteredTerms(data.terms);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching glossary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterTerms(query, selectedCategory);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    filterTerms(searchQuery, category, selectedLetter);
  };

  const handleLetterChange = (letter) => {
    setSelectedLetter(letter);
    filterTerms(searchQuery, selectedCategory, letter);
  };

  const filterTerms = (query, category, letter) => {
    let filtered = terms;

    if (category !== 'All') {
      filtered = filtered.filter(term => term.category === category);
    }

    if (letter !== 'All') {
      filtered = filtered.filter(term => term.term.toUpperCase().startsWith(letter));
    }

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(term =>
        term.term.toLowerCase().includes(lowerQuery) ||
        term.definition.toLowerCase().includes(lowerQuery) ||
        (term.keywordVariations?.some(kv => kv.toLowerCase().includes(lowerQuery)))
      );
    }

    setFilteredTerms(filtered);
  };

  return (
    <>
      <Helmet>
        <title>Developer Glossary 2026 — 1,500+ Technical Definitions & Concepts</title>
        <meta
          name="description"
          content="Comprehensive developer glossary with 1,500+ technical definitions. Learn DevOps, microservices, databases, security, programming, and more. Free resource for all developers."
        />
        <meta name="keywords" content="developer glossary, technical definitions, devops terms, programming concepts, microservices, architecture, web development" />
        <meta property="og:title" content="Developer Glossary 2026 — 1,500+ Technical Definitions" />
        <meta property="og:description" content="Learn 1,500+ technical concepts with clear definitions, examples, and real-world applications." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://roadmaptic.qzz.io/glossary" />

        {/* FAQPage Schema for featured snippets */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is a microservices architecture?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Microservices are small, independent, loosely-coupled services that work together to build a complete application."
                }
              },
              {
                "@type": "Question",
                "name": "What is Docker and why use it?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Docker is a containerization platform that packages applications with dependencies into lightweight containers for consistent execution."
                }
              }
            ]
          })}
        </script>

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://roadmaptic.qzz.io/" },
              { "@type": "ListItem", "position": 2, "name": "Glossary", "item": "https://roadmaptic.qzz.io/glossary" }
            ]
          })}
        </script>
      </Helmet>

      <div className="glossary-container">
        <section className="glossary-hero">
          <div className="hero-badge">Curated Developer Insights</div>
          <h1>Developer Glossary</h1>
          <p>Master 1,500+ technical definitions, concepts, and industry best practices designed for the modern engineer.</p>
        </section>

        {/* Search Bar */}
        <section className="glossary-search">
          <div className="search-wrapper">
            <Search size={22} className="search-icon" />
            <input
              type="text"
              placeholder="Search concepts (e.g. 'Kubernetes', 'B-Tree', 'Zero Trust')..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </section>

        {/* Alphabet Index */}
        <div className="alphabet-index">
          {alphabet.map(letter => (
            <button
              key={letter}
              className={`alpha-btn ${selectedLetter === letter ? 'active' : ''}`}
              onClick={() => handleLetterChange(letter)}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <section className="glossary-filter">
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Results Info */}
        <div className="results-info">
          <p>Catalog Index: {filteredTerms.length} matches</p>
          {selectedCategory !== 'All' && <span className="active-filter">Category: {selectedCategory}</span>}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Indexing glossary terms...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-card">
            <h3>System Notice</h3>
            <p>{error}</p>
            <button onClick={fetchGlossary} className="btn-primary" style={{ marginTop: '20px' }}>Retry Connection</button>
          </div>
        )}

        {/* Terms List */}
        {!loading && !error && (
          <section className="glossary-terms">
            {filteredTerms.length > 0 ? (
              filteredTerms.map(term => (
                <GlossaryTerm 
                  key={term._id} 
                  term={term} 
                  isExpanded={expandedTerm === term._id}
                  onToggle={() => setExpandedTerm(expandedTerm === term._id ? null : term._id)}
                />
              ))
            ) : (
              <div className="no-results">
                <p>No matches found for your current filters.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedLetter('All'); filterTerms('', 'All', 'All'); }} className="btn-secondary" style={{ marginTop: '16px' }}>Clear All Filters</button>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

// Individual Glossary Term Component
function GlossaryTerm({ term, isExpanded, onToggle }) {
  return (
    <article
      className={`glossary-term ${isExpanded ? 'is-expanded' : ''}`}
      itemScope
      itemType="https://schema.org/DefinedTerm"
    >
      <div className="term-header" onClick={onToggle}>
        <div className="term-info">
          <div className="term-category">{term.category}</div>
          <h3 itemProp="name">{term.term}</h3>
        </div>
        <ChevronDown className={`expand-icon ${isExpanded ? 'expanded' : ''}`} size={20} />
      </div>

      {isExpanded && (
        <div className="term-content">
          <p className="definition" itemProp="definition">{term.definition}</p>

          {term.example && (
            <div className="term-section">
              <h4>Practical Example</h4>
              <p className="example">{term.example}</p>
            </div>
          )}

          {term.description && (
            <div className="term-section">
              <h4>Context & Usage</h4>
              <p className="definition">{term.description}</p>
            </div>
          )}

          {term.relatedTerms && term.relatedTerms.length > 0 && (
            <div className="term-section">
              <h4>Related Concepts</h4>
              <div className="related-terms">
                {term.relatedTerms.map(related => (
                  <a key={related} href={`#${related}`} className="related-link">
                    {related}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden metadata for search engines */}
      <meta itemProp="url" content={`https://roadmaptic.qzz.io/glossary/${term.slug}`} />
    </article>
  );
}

export default Glossary;
