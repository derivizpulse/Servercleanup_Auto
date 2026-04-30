// CareFlow Top Bar — exact match of Figma frame node 17453:29908
// Assets valid for 7 days from generation (Apr 22, 2026)

const ASSETS = {
  logo:         "https://www.figma.com/api/mcp/asset/2a0a6719-f9f4-4162-8f81-817537cc2648",
  searchIcon:   "https://www.figma.com/api/mcp/asset/a4b42c6f-e12a-4397-bc6c-5288b17daa94",
  userIconMask: "https://www.figma.com/api/mcp/asset/a73f45e4-7e81-44c0-859d-39f17e614610",
  userIcon:     "https://www.figma.com/api/mcp/asset/96864e06-3331-43d5-a976-fa65e7853979",
  dropdownIcon: "https://www.figma.com/api/mcp/asset/d9c43916-c827-4080-ad06-df5e810b607e",
  hubspotLogo:  "https://www.figma.com/api/mcp/asset/5fa0f4aa-6786-4c70-834e-4bc42330c722",
  faqIcon:      "https://www.figma.com/api/mcp/asset/f79b9d7b-311d-423f-ae18-ef90d2739447",
  bellMask:     "https://www.figma.com/api/mcp/asset/253368bf-376a-4b7d-abac-a2b0fe4ab2ed",
  bellIcon:     "https://www.figma.com/api/mcp/asset/1bc57858-0bf0-4cea-aed5-eda7f788aa8d",
  hamburger:    "https://www.figma.com/api/mcp/asset/d8a6abd2-8a38-4a0a-b153-bafe52a19fc0",
};

export default function CfTopBar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between"
      style={{
        height: "30px",
        backgroundColor: "#44515C",
        boxShadow: "0 1px 0 0 rgba(0,0,0,0.15)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center px-[7px] shrink-0">
        <div className="flex items-center justify-center overflow-hidden w-[100px] h-[17px]">
          <img
            src={ASSETS.logo}
            alt="Deriviz"
            className="h-[17px] w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          {/* fallback text logo */}
          <span
            className="hidden text-[#42BA78] font-bold text-[13px] tracking-wide"
            style={{ display: "none" }}
          >
            DERIVIZ
          </span>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex items-center w-[350px] shrink-0">
        {/* Search input */}
        <div className="flex-1 flex items-center bg-white rounded-l-[3px] h-[22px] overflow-hidden">
          <div className="flex items-center pl-[6px] pr-[4px]">
            <img src={ASSETS.searchIcon} alt="" className="w-[14px] h-[14px] shrink-0" />
          </div>
          <span
            className="text-[13px] leading-none whitespace-nowrap"
            style={{ color: "#6C757D", fontFamily: "Roboto, sans-serif", fontWeight: 400 }}
          >
            Search
          </span>
        </div>
        {/* Account/org switcher */}
        <div className="border-l border-[#D5D5D5] pl-px shrink-0">
          <div className="flex items-center bg-white rounded-r-[3px] h-[22px] px-[5px] gap-0">
            {/* user icon with mask */}
            <div className="w-[16px] h-[16px] flex items-center justify-center shrink-0">
              <img
                src={ASSETS.userIcon}
                alt=""
                className="w-[12px] h-[10px] object-contain"
                style={{
                  WebkitMaskImage: `url('${ASSETS.userIconMask}')`,
                  WebkitMaskSize: "12px 10.2px",
                  WebkitMaskRepeat: "no-repeat",
                  maskImage: `url('${ASSETS.userIconMask}')`,
                  maskSize: "12px 10.2px",
                  maskRepeat: "no-repeat",
                }}
              />
            </div>
            {/* chevron */}
            <div className="w-[16px] h-[16px] flex items-center justify-center shrink-0">
              <img src={ASSETS.dropdownIcon} alt="" className="w-[10px] h-[10px] object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Right utility cluster */}
      <div className="flex items-center ml-auto">
        {/* HubSpot */}
        <button className="flex items-center justify-center px-[8px] h-[30px] hover:bg-white/10 transition-colors">
          <img src={ASSETS.hubspotLogo} alt="HubSpot" className="w-[16px] h-[18px] object-contain" />
        </button>

        {/* FAQ */}
        <button className="flex items-center justify-center pl-[8px] pr-[13px] h-[30px] hover:bg-white/10 transition-colors">
          <img src={ASSETS.faqIcon} alt="FAQ" className="w-[18px] h-[18px] object-contain" />
        </button>

        {/* Bell with badge */}
        <button className="flex items-center justify-center px-[8px] h-[30px] hover:bg-white/10 transition-colors relative">
          <div className="relative w-[18px] h-[18px]">
            <img
              src={ASSETS.bellIcon}
              alt="Notifications"
              className="w-[15px] h-[18px] object-contain"
              style={{
                WebkitMaskImage: `url('${ASSETS.bellMask}')`,
                WebkitMaskSize: "15px 17.813px",
                WebkitMaskRepeat: "no-repeat",
                maskImage: `url('${ASSETS.bellMask}')`,
                maskSize: "15px 17.813px",
                maskRepeat: "no-repeat",
              }}
            />
          </div>
          {/* notification count badge */}
          <span
            className="absolute flex items-center justify-center text-white"
            style={{
              top: "1.75px",
              left: "50%",
              transform: "translateX(2px)",
              backgroundColor: "#FF6375",
              border: "1px solid #FF6375",
              borderRadius: "17px",
              minWidth: "26px",
              height: "16px",
              fontSize: "8px",
              fontWeight: 700,
              lineHeight: "16px",
              padding: "0 4px",
            }}
          >
            636
          </span>
        </button>

        {/* User / account */}
        <button className="flex items-center pl-[8px] pr-[16px] h-[30px] hover:bg-white/10 transition-colors gap-[2px]">
          <span
            className="text-white whitespace-nowrap max-w-[150px] overflow-hidden text-ellipsis"
            style={{ fontSize: "12px", fontFamily: "Roboto, sans-serif", fontWeight: 400, lineHeight: "30px" }}
          >
            Krishnan S, Vivek
          </span>
          <div className="w-[20px] h-[30px] flex items-center justify-center">
            <img src={ASSETS.hamburger} alt="" className="w-[16px] h-[16px] object-contain" />
          </div>
        </button>
      </div>
    </header>
  );
}
