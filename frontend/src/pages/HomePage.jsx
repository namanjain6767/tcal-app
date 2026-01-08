import React, { useEffect, useState } from 'react';
import '../styles/homepage-styles.css'; // Import CSS from src/styles

export default function HomePage({ setPage }) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Small delay to ensure CSS is applied
        const timer = setTimeout(() => setIsReady(true), 50);

        // --- Loading Screen - Hide after ready ---
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && isReady) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                document.body.style.overflow = 'visible';
            }, 500);
        }

        // --- Counter Animations (optimized) ---
        const counters = document.querySelectorAll('.stat-number, .trust-number');
        const animateCounter = (element) => {
            const target = parseFloat(element.dataset.target);
            if (isNaN(target)) return;
            const duration = 1000; // Reduced from 2000ms
            let start = 0;
            const step = (timestamp) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const current = Math.min((target / duration) * progress, target);
                element.textContent = Math.floor(current);
                if (progress < duration) {
                    window.requestAnimationFrame(step);
                } else {
                    element.textContent = target;
                }
            };
            window.requestAnimationFrame(step);
        };
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        counters.forEach(counter => counterObserver.observe(counter));

        // --- Smooth Scrolling for internal links ---
        const handleLinkClick = (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleLinkClick);
        });

        // --- CTA Button Clicks ---
        const primaryCta = document.getElementById('heroCtaPrimary');
        const secondaryCta = document.getElementById('heroCtaSecondary');
        if (primaryCta) primaryCta.onclick = () => setPage('appsList');
        if (secondaryCta) secondaryCta.onclick = () => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });


        // Cleanup function
        return () => {
            clearTimeout(timer);
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.removeEventListener('click', handleLinkClick);
            });
        };
    }, [setPage, isReady]);

    // Show nothing until CSS is ready (prevents flash)
    if (!isReady) {
        return (
            <div style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'linear-gradient(135deg, #000, #333)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 9999 
            }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ 
                        width: 60, 
                        height: 60, 
                        border: '3px solid #666', 
                        borderTopColor: '#fff', 
                        borderRadius: '50%', 
                        margin: '0 auto 16px',
                        animation: 'spin 0.8s linear infinite'
                    }}></div>
                    <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '0.2em' }}>DRAVETA</div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }


    return (
        <div>
            {/* This HTML structure is from your original index.html file */}
            <div className="loading-screen" id="loadingScreen">
                <div className="loading-content">
                    <div className="loading-logo">
                        <div className="loading-circle"></div>
                        <div className="loading-text">DRAVETA</div>
                    </div>
                    <div className="loading-progress">
                        <div className="progress-bar"></div>
                    </div>
                </div>
            </div>

            <header className="header" id="header">
                <nav className="nav container">
                    <div className="nav-brand">
                        <div className="logo">
                            <img src="/logo.png" alt="Draveta Technologies" className="logo-image" />
                            <span className="logo-text">DRAVETA TECHNOLOGIES</span>
                        </div>
                    </div>
                    <ul className="nav-menu" id="navMenu">
                        <li className="nav-item"><a href="#home" className="nav-link">Home</a></li>
                        <li className="nav-item"><a href="#about" className="nav-link">About</a></li>
                        <li className="nav-item"><a href="#software" className="nav-link">Our Software</a></li>
                        <li className="nav-item"><a href="#why-choose" className="nav-link">Why Choose Us</a></li>
                        <li className="nav-item"><a href="#contact" className="nav-link">Contact</a></li>
                    </ul>
                </nav>
            </header>

            <section className="hero" id="home">
                <div className="hero-background">
                    <div className="hero-particles"></div>
                    <div className="hero-grid"></div>
                </div>
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            <span className="title-line">Industrial Excellence</span>
                            <span className="title-line">Software Solutions</span>
                        </h1>
                        <p className="hero-subtitle">
                            Premium industrial software solutions designed to transform industrial operations across India.
                        </p>
                        <div className="hero-cta">
                            <button className="btn btn--primary" id="heroCtaPrimary">
                                Explore Our Software
                            </button>
                            <button className="btn btn--outline" id="heroCtaSecondary">
                                Contact Us
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <div className="stat-number" data-target="15">0</div>
                                <div className="stat-label">Years Combined Experience</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number" data-target="100">0</div>
                                <div className="stat-label">% Enterprise Grade</div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-number" data-target="24">0</div>
                                <div className="stat-label">/7 Support</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about" id="about">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Built for Indian Industries</h2>
                    </div>
                    <div className="about-features">
                        <div className="about-feature">
                            <span className="feature-icon">🎯</span>
                            <h4>Our Mission</h4>
                            <p>To revolutionize India's industrial landscape through intelligent, reliable, and scalable software solutions.</p>
                        </div>
                        <div className="about-feature">
                            <span className="feature-icon">⚡</span>
                            <h4>Fast & Reliable</h4>
                            <p>Lightning-fast performance optimized for real-world industrial environments and workflows.</p>
                        </div>
                        <div className="about-feature">
                            <span className="feature-icon">🔒</span>
                            <h4>Secure & Trusted</h4>
                            <p>Enterprise-grade security protecting your business data with industry-standard encryption.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="software" id="software">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Our Software Solutions</h2>
                    </div>
                    <div className="software-grid">
                        <div className="software-card">
                            <div className="software-badge live">Live</div>
                            <h3 className="software-title">T-Cal</h3>
                            <p className="software-tagline">Precision Timber Calculator for streamlined estimation, optimization, and procurement across the wood supply chain.</p>
                        </div>
                        <div className="software-card">
                            <div className="software-badge live">Live</div>
                            <h3 className="software-title">T-Job Sheet</h3>
                            <p className="software-tagline">Digital job sheet management system for tracking production tasks, assigning work to teams, and monitoring completion status.</p>
                        </div>
                        <div className="software-card">
                            <div className="software-badge coming">Coming Soon</div>
                            <h3 className="software-title">T-Connect</h3>
                            <p className="software-tagline">A marketplace connecting timber sellers and buyers, enabling seamless trade, price discovery, and business networking across the industry.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="why-choose" id="why-choose">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Enterprise-Grade Excellence</h2>
                    </div>
                    <div className="credentials-grid">
                        <div className="credential-card">
                            <h3>Engineering Excellence</h3>
                            <p>Developed by software engineers with great industrial experience</p>
                        </div>
                        <div className="credential-card">
                            <h3>Enterprise-Grade Security</h3>
                            <p>Military-standard security protocols and compliance frameworks</p>
                        </div>
                        <div className="credential-card">
                            <h3>24/7 Professional Support</h3>
                            <p>Dedicated support team ensuring maximum uptime and performance</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="contact" id="contact">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Get In Touch</h2>
                    </div>
                    <div className="contact-simple">
                        <div className="contact-item-large">
                            <span className="contact-icon">📧</span>
                            <a href="mailto:namanjain6767@gmail.com">namanjain6767@gmail.com</a>
                        </div>
                        <div className="contact-item-large">
                            <span className="contact-icon">📞</span>
                            <a href="tel:+919829011726">+91 98290 11726</a>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="container">
                    <p>&copy; 2026 Draveta Technologies. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
