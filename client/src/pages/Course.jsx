import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function Course() {
  const { courseId } = useParams();
  const [courses, setCourses] = useState([]);
  const [imageUrl, setImageUrl] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await axios.get("http://localhost:5000/courses");
        setCourses(res.data);
        const courseImages = res.data.find((c) => String(c.id) === String(courseId))?.sec_img || [];
        setImageUrl(courseImages);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [courseId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading your images...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Course #{courseId}</h1>
          <p style={styles.subtitle}>Your exclusive image collection</p>
        </div>
        <div style={styles.watermark}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span>Premium Content</span>
        </div>
      </div>

      {/* Security Notice */}
      <div style={styles.securityNotice}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span>This is protected content. Please don't share these images.</span>
      </div>

      {/* Image Gallery */}
      {imageUrl.length > 0 ? (
        <>
          <div style={styles.galleryHeader}>
            <h3 style={styles.galleryTitle}>Your Image Gallery</h3>
            <p style={styles.imageCount}>{imageUrl.length} {imageUrl.length === 1 ? 'image' : 'images'}</p>
          </div>
          
          <div style={styles.imageGrid}>
            {imageUrl.map((url, index) => (
              <div 
                key={index} 
                style={styles.imageCard}
                onClick={() => setSelectedImage(url)}
              >
                <div style={styles.imageWrapper}>
                  <img 
                    src={url} 
                    alt={`Course ${courseId} Image ${index + 1}`} 
                    style={styles.image}
                    loading="lazy"
                  />
                  <div style={styles.imageOverlay}>
                    <span style={styles.viewText}>Click to view</span>
                  </div>
                </div>
                <div style={styles.imageFooter}>
                  <span style={styles.imageNumber}>Image {index + 1}</span>
                  <button 
                    style={styles.downloadBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(url, '_blank');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="8" y1="2" x2="8" y2="22"></line>
            <line x1="16" y1="2" x2="16" y2="22"></line>
            <line x1="2" y1="8" x2="22" y2="8"></line>
            <line x1="2" y1="16" x2="22" y2="16"></line>
          </svg>
          <h3 style={styles.emptyTitle}>No images found</h3>
          <p style={styles.emptyText}>This course doesn't have any images yet.</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div style={styles.modal} onClick={() => setSelectedImage(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedImage(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <img src={selectedImage} alt="Enlarged view" style={styles.modalImage} />
            <div style={styles.modalActions}>
              <a 
                href={selectedImage} 
                download 
                style={styles.downloadLink}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "20px"
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 8px 0",
    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.02em"
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#64748b",
    margin: 0
  },
  watermark: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#f1f5f9",
    borderRadius: "100px",
    color: "#475569",
    fontSize: "0.9rem",
    fontWeight: "500"
  },
  securityNotice: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "16px 20px",
    backgroundColor: "#fef3c7",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    color: "#92400e",
    fontSize: "0.95rem",
    marginBottom: "40px"
  },
  galleryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  galleryTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0
  },
  imageCount: {
    padding: "4px 12px",
    backgroundColor: "#e2e8f0",
    borderRadius: "100px",
    color: "#475569",
    fontSize: "0.9rem",
    fontWeight: "500"
  },
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "24px",
    marginBottom: "40px"
  },
  imageCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    transition: "all 0.3s ease",
    cursor: "pointer",
    border: "1px solid #e2e8f0",
    ":hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
    }
  },
  imageWrapper: {
    position: "relative",
    paddingTop: "75%",
    overflow: "hidden"
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.5s ease"
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.3s ease",
    ":hover": {
      opacity: 1
    }
  },
  viewText: {
    color: "white",
    fontSize: "0.9rem",
    fontWeight: "500",
    padding: "8px 16px",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: "100px",
    backdropFilter: "blur(4px)"
  },
  imageFooter: {
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1px solid #e2e8f0"
  },
  imageNumber: {
    fontSize: "0.9rem",
    color: "#475569",
    fontWeight: "500"
  },
  downloadBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px",
    color: "#64748b",
    borderRadius: "6px",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f1f5f9",
      color: "#2563eb"
    }
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f8fafc",
    borderRadius: "24px",
    border: "2px dashed #cbd5e1"
  },
  emptyTitle: {
    fontSize: "1.5rem",
    color: "#334155",
    margin: "16px 0 8px 0"
  },
  emptyText: {
    color: "#64748b",
    margin: 0
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px"
  },
  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  loadingText: {
    marginTop: "16px",
    color: "#64748b"
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  modalContent: {
    position: "relative",
    maxWidth: "90vw",
    maxHeight: "90vh"
  },
  modalImage: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
    borderRadius: "8px"
  },
  closeBtn: {
    position: "absolute",
    top: "-40px",
    right: "-40px",
    background: "white",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#1e293b",
    transition: "all 0.2s ease",
    ":hover": {
      transform: "scale(1.1)",
      backgroundColor: "#f1f5f9"
    }
  },
  modalActions: {
    position: "absolute",
    bottom: "-60px",
    left: "50%",
    transform: "translateX(-50%)"
  },
  downloadLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    backgroundColor: "white",
    color: "#1e293b",
    textDecoration: "none",
    borderRadius: "100px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "#f1f5f9",
      transform: "translateY(-2px)"
    }
  }
};

// Add this to your global CSS or in a style tag
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export default Course;