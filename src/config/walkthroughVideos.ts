/**
 * Cloudinary video URLs for quest creation step walkthroughs.
 * Centralised here so step components never hardcode URLs.
 *
 * Delivery optimisation (q_auto / f_auto) is applied by the
 * VideoWalkthroughModal component at render time – URLs here are
 * the canonical Cloudinary upload paths with no transform segments.
 */

export const WALKTHROUGH_VIDEOS = {
    /** Used by both the Location step. */
    LOCATION:
        "https://res.cloudinary.com/seekkrr/video/upload/v1773575323/Quest_Creation_vnfst7.mp4",
    
        /** Used by Details step. */
    DETAILS:
        "https://res.cloudinary.com/seekkrr/video/upload/v1773575324/Quest_Details_basm7y.mp4",
    
        /** Used by the Waypoints step. */
    WAYPOINTS:
        "https://res.cloudinary.com/seekkrr/video/upload/v1773575323/Adding_Waypoints_Speed_x5phxk.mp4",

    /** Used by the Waypoint Details step. */
    WAYPOINT_DETAILS:
        "https://res.cloudinary.com/seekkrr/video/upload/v1773572709/Waypoints_detail_without_watermark_jos4au.mp4",
} as const;
