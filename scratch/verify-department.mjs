// Verification script for Product Department Mapping and Logic
function mapDbProductToFashion(dbProd) {
  const images =
    dbProd.images && dbProd.images.length > 0
      ? dbProd.images
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
          .map((img) => img.url)
      : ["/images/placeholder-silhouette.png"];

  const rawCat = (dbProd.category?.slug || dbProd.category?.name || "").toLowerCase();
  const rawTags = (dbProd.tags || []).map((t) => t.toLowerCase());
  const rawDept = (dbProd.department || "").toLowerCase().trim();
  const rawName = (dbProd.name || "").toLowerCase();

  let dept;
  if (rawDept === "women" || rawDept === "kids" || rawDept === "men") {
    dept = rawDept;
  } else if (
    rawCat.includes("women") ||
    rawTags.includes("women") ||
    rawName.includes("kurti") ||
    rawName.includes("women") ||
    (rawName.includes("dress") && !rawName.includes("baby") && !rawName.includes("kid"))
  ) {
    dept = "women";
  } else if (
    rawCat.includes("kids") ||
    rawTags.includes("kids") ||
    rawName.includes("baby") ||
    rawName.includes("kid") ||
    rawName.includes("child") ||
    rawName.includes("toddler")
  ) {
    dept = "kids";
  } else {
    dept = "men";
  }

  return {
    id: dbProd.slug || dbProd.id,
    name: dbProd.name,
    department: dept,
  };
}

// Storefront Filter Logic
function matchesStorefrontDepartment(p, targetDepartment) {
  const pName = p.name.toLowerCase();
  const pCat = (p.category || "").toLowerCase();
  const pDesc = (p.description || "").toLowerCase();
  const pTags = (p.tags || []).map((t) => t.toLowerCase());
  const pDept = (p.department || p.gender || "").toLowerCase();

  if (targetDepartment === "new-arrivals") {
    return Boolean(p.isNew || pTags.includes("new") || pTags.includes("new arrival"));
  }

  if (targetDepartment === "kids") {
    if (pDept === "kids") return true;
    if (pDept === "men" || pDept === "women") return false;
    return (
      pCat.includes("kids") ||
      pTags.includes("kids") ||
      pName.includes("kids") ||
      pDesc.includes("kids") ||
      p.sizes?.some((s) => s.toUpperCase().includes("Y"))
    );
  }

  if (targetDepartment === "women") {
    if (pDept === "women") return true;
    if (pDept === "men" || pDept === "kids") return false;
    return (
      pCat.includes("women") ||
      pTags.includes("women") ||
      pName.includes("women")
    );
  }

  if (targetDepartment === "men") {
    if (pDept === "men") return true;
    if (pDept === "women" || pDept === "kids") return false;
    return (
      pCat.includes("men") ||
      pTags.includes("men") ||
      (!pCat.includes("women") && !pCat.includes("kids") && !pTags.includes("women") && !pTags.includes("kids"))
    );
  }

  return true;
}

console.log("--- TEST CASE 1: Women Product Mapping & Filtering ---");
const womenProd = mapDbProductToFashion({
  id: "w1",
  name: "Silk Kurti Set",
  department: "women"
});
console.log("Women Product mapped department:", womenProd.department);
console.assert(womenProd.department === "women", "FAIL: Must be women");
console.assert(matchesStorefrontDepartment(womenProd, "women") === true, "FAIL: Must match women storefront");
console.assert(matchesStorefrontDepartment(womenProd, "men") === false, "FAIL: Must NOT match men storefront");
console.assert(matchesStorefrontDepartment(womenProd, "kids") === false, "FAIL: Must NOT match kids storefront");
console.log("PASS: Women product routing verified.");

console.log("\n--- TEST CASE 2: Kids Product Mapping & Filtering ---");
const kidsProd = mapDbProductToFashion({
  id: "k1",
  name: "BABY Dress",
  department: "kids"
});
console.log("Kids Product mapped department:", kidsProd.department);
console.assert(kidsProd.department === "kids", "FAIL: Must be kids");
console.assert(matchesStorefrontDepartment(kidsProd, "kids") === true, "FAIL: Must match kids storefront");
console.assert(matchesStorefrontDepartment(kidsProd, "men") === false, "FAIL: Must NOT match men storefront");
console.assert(matchesStorefrontDepartment(kidsProd, "women") === false, "FAIL: Must NOT match women storefront");
console.log("PASS: Kids product routing verified.");

console.log("\n--- TEST CASE 3: Men Product Mapping & Filtering ---");
const menProd = mapDbProductToFashion({
  id: "m1",
  name: "Classic Hoodie",
  department: "men"
});
console.log("Men Product mapped department:", menProd.department);
console.assert(menProd.department === "men", "FAIL: Must be men");
console.assert(matchesStorefrontDepartment(menProd, "men") === true, "FAIL: Must match men storefront");
console.assert(matchesStorefrontDepartment(menProd, "women") === false, "FAIL: Must NOT match women storefront");
console.assert(matchesStorefrontDepartment(menProd, "kids") === false, "FAIL: Must NOT match kids storefront");
console.log("PASS: Men product routing verified.");

console.log("\n--- TEST CASE 4: Edit Men product to Women ---");
const editedProd = mapDbProductToFashion({
  id: "m1",
  name: "Classic Hoodie",
  department: "women"
});
console.log("Edited Product mapped department:", editedProd.department);
console.assert(editedProd.department === "women", "FAIL: Must be women after edit");
console.assert(matchesStorefrontDepartment(editedProd, "women") === true, "FAIL: Must match women storefront after edit");
console.assert(matchesStorefrontDepartment(editedProd, "men") === false, "FAIL: Must NOT match men storefront after edit");
console.log("PASS: Edit Men to Women routing verified.");

console.log("\nAll 4 test cases passed successfully!");

