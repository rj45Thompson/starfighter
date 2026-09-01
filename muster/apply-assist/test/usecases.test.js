/* The use cases from PROBLEM.md, run in a real browser.
 *
 * detect.test.js proves classify() returns the right key for a signature.
 * That is necessary and not sufficient: it cannot show that a value actually
 * lands in a live React field, that the resume goes in the resume slot rather
 * than the cover-letter one, that undo really restores, or that nothing ever
 * submits. Those are properties of a person applying to a job, so they are
 * tested as that, against markup shaped like the real ATSs.
 *
 *   npm i playwright-core && node extension/test/usecases.test.js
 */

const path = require("path");
const fs = require("fs");
const { browser: findBrowser, launch } = require("./browser.js");

const ENV = findBrowser("use cases");
if (!ENV) process.exit(0);

const SRC = path.join(__dirname, "..", "src");

const PROFILE = {
  firstName: "RJ", lastName: "Thompson", fullName: "RJ Thompson",
  email: "rj@example.com", phone: "+1 555 0100",
  city: "Toronto", region: "Ontario", country: "Canada", postal: "M5V 2T6",
  address: "1 King Street West",
  linkedin: "https://linkedin.com/in/example",
  github: "https://github.com/example",
  currentTitle: "Operations Lead", currentCompany: "Acme",
  yearsExperience: "12",
  salary: "140000",
  availability: "Available to start immediately",
  workAuth: "Yes", sponsorship: "No",
  referral: "LinkedIn",
  coverLetter: "I run operations and I ship.",
  resumeFile: { name: "RJ_Thompson_Resume.pdf", type: "application/pdf",
                data: Buffer.from("%PDF-1.4 resume").toString("base64") },
  coverLetterFile: { name: "RJ_Thompson_Cover.pdf", type: "application/pdf",
                     data: Buffer.from("%PDF-1.4 cover").toString("base64") }
};

let pass = 0, fail = 0;
const ok = (desc, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + desc); }
  else { fail++; console.log("  FAIL " + desc + (extra !== undefined ? "\n         " + JSON.stringify(extra) : "")); }
};
const eq = (desc, actual, expected) =>
  ok(desc, JSON.stringify(actual) === JSON.stringify(expected),
     { expected, actual });

(async () => {
  const browser = await launch(ENV);
  if (!browser) process.exit(0);
  const errors = [];

  /* A page with the real content script on it, standing in for the extension
   * host. Every page also records any submit that fires, anywhere, so use
   * case 10 is checked on all of them rather than only its own. */
  async function open(html) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setContent(html);
    await page.addScriptTag({ content: `
      window.chrome = { runtime: { onMessage: { addListener: (fn) => { window.__listener = fn; } } } };
      window.__submits = [];
      document.addEventListener("submit", (e) => {
        window.__submits.push(e.target.getAttribute("data-name") || "form");
        e.preventDefault();
      }, true);
      window.__clicked = [];
      document.addEventListener("click", (e) => {
        const t = e.target.closest("button, input[type=submit]");
        if (t) window.__clicked.push(t.textContent || t.value);
      }, true);
    ` });
    for (const f of ["fields.js", "content.js"]) {
      await page.addScriptTag({ content: fs.readFileSync(path.join(SRC, f), "utf8") });
    }
    page.fill_ = (opts = {}) => page.evaluate(
      ([profile, opts]) => new Promise((resolve) => {
        window.__listener({ type: "AA_FILL", profile, ...opts }, null, resolve);
      }), [PROFILE, opts]);
    page.undo_ = () => page.evaluate(() => new Promise((resolve) => {
      window.__listener({ type: "AA_UNDO" }, null, resolve);
    }));
    page.val = (sel) => page.$eval(sel, (e) => e.value);
    return page;
  }

  const quiet = async (page, label) => {
    eq(label + ": nothing was submitted", await page.evaluate(() => window.__submits), []);
    eq(label + ": no submit control was touched",
       await page.evaluate(() => window.__clicked), []);
  };

  /* ---- 1. the plain application (Greenhouse-shaped) ---- */
  console.log("\n1. the plain application");
  {
    const page = await open(`
      <form data-name="apply">
        <h2>Apply for Operations Lead</h2>
        <label for="fn">Full name *</label><input id="fn" name="full_name">
        <label for="em">Email *</label><input id="em" name="email" type="email">
        <label for="ph">Phone</label><input id="ph" name="phone">
        <label for="ct">City</label><input id="ct" name="city">
        <label for="li">LinkedIn Profile</label><input id="li" name="linkedin_url">
        <label for="rs">Resume/CV *</label><input id="rs" name="resume" type="file">
        <label for="cl">Cover letter</label><textarea id="cl" name="cover_letter"></textarea>
        <button type="submit">Submit application</button>
      </form>`);
    const r = await page.fill_();
    eq("full name", await page.val("#fn"), "RJ Thompson");
    eq("email", await page.val("#em"), "rj@example.com");
    eq("phone", await page.val("#ph"), "+1 555 0100");
    eq("city", await page.val("#ct"), "Toronto");
    eq("linkedin", await page.val("#li"), "https://linkedin.com/in/example");
    eq("cover letter", await page.val("#cl"), "I run operations and I ship.");
    eq("the resume is attached",
       await page.$eval("#rs", (e) => e.files.length && e.files[0].name),
       "RJ_Thompson_Resume.pdf");
    ok("the report counts what it filled", r.filled >= 7, r);
    await quiet(page, "plain application");
    await page.close();
  }

  /* ---- 2. split names and custom questions (Lever-shaped) ---- */
  console.log("\n2. split names and custom questions");
  {
    const page = await open(`
      <form data-name="lever">
        <h2>Apply</h2>
        <label>First name<input name="cards[first]" autocomplete="given-name"></label>
        <label>Last name<input name="cards[last]" autocomplete="family-name"></label>
        <label>Email<input name="email" type="email"></label>
        <label>How did you hear about us?<input name="hear_about"></label>
        <label>Salary expectation<input name="salary_expectation"></label>
        <fieldset><legend>Are you legally authorized to work in Canada?</legend>
          <label><input type="radio" name="auth" value="Yes"> Yes</label>
          <label><input type="radio" name="auth" value="No"> No</label>
        </fieldset>
        <button type="submit">Submit</button>
      </form>`);
    await page.fill_();
    eq("first name", await page.val('[name="cards[first]"]'), "RJ");
    eq("last name", await page.val('[name="cards[last]"]'), "Thompson");
    ok("first name did not receive the last name",
       (await page.val('[name="cards[first]"]')) !== "Thompson");
    eq("referral source", await page.val('[name="hear_about"]'), "LinkedIn");
    eq("salary", await page.val('[name="salary_expectation"]'), "140000");
    eq("work authorization radio",
       await page.$eval('[name="auth"][value="Yes"]', (e) => e.checked), true);
    await quiet(page, "lever");
    await page.close();
  }

  /* ---- 3. labels that are not labels (Workday-shaped) ---- */
  console.log("\n3. labels that are not labels");
  {
    const page = await open(`
      <form data-name="workday">
        <h2>My Information</h2>
        <div data-automation-id="legalNameSection_firstName">
          <div class="label">First Name</div><input>
        </div>
        <div data-automation-id="legalNameSection_lastName">
          <div class="label">Last Name</div><input>
        </div>
        <div data-automation-id="email">
          <div class="label">Email Address</div><input>
        </div>
        <div data-automation-id="phone">
          <div class="label">Phone Number</div><input>
        </div>
        <button type="submit">Save and Continue</button>
      </form>`);
    await page.fill_();
    eq("first name", await page.val('[data-automation-id$="firstName"] input'), "RJ");
    eq("last name", await page.val('[data-automation-id$="lastName"] input'), "Thompson");
    eq("email", await page.val('[data-automation-id="email"] input'), "rj@example.com");
    eq("phone", await page.val('[data-automation-id="phone"] input'), "+1 555 0100");
    await quiet(page, "workday");
    await page.close();
  }

  /* ---- 4. the sign-in wall ---- */
  console.log("\n4. the sign-in wall");
  {
    const page = await open(`
      <div id="stage">
        <form data-name="signin">
          <h2>Sign in to continue your application</h2>
          <label>Email<input id="loginEmail" name="username" type="email"
                 autocomplete="username"></label>
          <label>Password<input id="loginPw" name="password" type="password"></label>
          <button type="submit">Sign in</button>
        </form>
      </div>`);
    const r = await page.fill_();
    eq("the login email box is left empty", await page.val("#loginEmail"), "");
    eq("nothing was filled at all", r.filled, 0);
    eq("the wall is reported", r.wall, true);
    await quiet(page, "sign-in");

    // They sign in; the application appears where the login was.
    await page.evaluate(() => {
      document.querySelector("#stage").innerHTML = `
        <form data-name="apply">
          <h2>Apply for Operations Lead</h2>
          <label for="e2">Email</label><input id="e2" name="email" type="email">
          <label for="n2">Full name</label><input id="n2" name="name">
        </form>`;
    });
    await page.waitForTimeout(1200);          // the observer settles, then fills
    eq("it finishes the job once the wall is down", await page.val("#e2"), "rj@example.com");
    eq("and fills the rest", await page.val("#n2"), "RJ Thompson");
    await quiet(page, "after sign-in");
    await page.close();
  }

  /* ---- 5. the demographic section ---- */
  console.log("\n5. the demographic section");
  {
    const page = await open(`
      <form data-name="eeo">
        <h2>Voluntary self-identification</h2>
        <label for="g">Gender</label>
          <select id="g" name="gender"><option value=""></option><option>Male</option></select>
        <label for="r">Race / Ethnicity</label>
          <select id="r" name="race"><option value=""></option><option>Prefer not to say</option></select>
        <label for="v">Veteran status</label><input id="v" name="veteran_status">
        <label for="d">Disability status</label><input id="d" name="disability">
        <label for="b">Date of birth</label><input id="b" name="dob">
        <label for="s">Social Insurance Number</label><input id="s" name="sin">
        <label for="e3">Email</label><input id="e3" name="email" type="email">
      </form>`);
    await page.fill_();
    for (const [what, sel] of [["gender", "#g"], ["race", "#r"], ["veteran status", "#v"],
                               ["disability", "#d"], ["date of birth", "#b"],
                               ["social insurance number", "#s"]]) {
      eq(what + " is untouched", await page.val(sel), "");
    }
    eq("but the email beside them still fills", await page.val("#e3"), "rj@example.com");
    await quiet(page, "eeo");
    await page.close();
  }

  /* ---- 6. a form partly filled already ---- */
  console.log("\n6. a form partly filled already");
  {
    const page = await open(`
      <form data-name="partial">
        <label for="e4">Email</label><input id="e4" name="email" value="me@myowndomain.com">
        <label for="p4">Phone</label><input id="p4" name="phone">
      </form>`);
    await page.fill_();
    eq("what they typed survives", await page.val("#e4"), "me@myowndomain.com");
    eq("the empty field beside it fills", await page.val("#p4"), "+1 555 0100");

    await page.fill_({ overwrite: true });
    eq("and overwrite: true does overwrite when asked",
       await page.val("#e4"), "rj@example.com");
    await page.close();
  }

  /* ---- 7. two upload slots ---- */
  console.log("\n7. two upload slots");
  {
    const page = await open(`
      <form data-name="uploads">
        <label for="u1">Resume</label><input id="u1" name="resume" type="file">
        <label for="u2">Cover letter</label><input id="u2" name="cover_letter" type="file">
      </form>`);
    await page.fill_();
    eq("the resume goes in the resume slot",
       await page.$eval("#u1", (e) => e.files[0] && e.files[0].name), "RJ_Thompson_Resume.pdf");
    eq("the cover letter goes in its own",
       await page.$eval("#u2", (e) => e.files[0] && e.files[0].name), "RJ_Thompson_Cover.pdf");
    await page.close();
  }

  /* ---- 8. undo ---- */
  console.log("\n8. undo");
  {
    const page = await open(`
      <form data-name="undo">
        <label for="e5">Email</label><input id="e5" name="email" value="typed@by.me">
        <label for="p5">Phone</label><input id="p5" name="phone">
        <label for="r5">Resume</label><input id="r5" name="resume" type="file">
        <fieldset><legend>Do you require sponsorship?</legend>
          <label><input type="radio" name="spon" value="Yes"> Yes</label>
          <label><input type="radio" name="spon" value="No"> No</label>
        </fieldset>
      </form>`);
    await page.fill_({ overwrite: true });
    eq("filled first", await page.val("#e5"), "rj@example.com");
    await page.undo_();
    eq("their own text is back", await page.val("#e5"), "typed@by.me");
    eq("the field it filled is empty again", await page.val("#p5"), "");
    eq("the file is detached", await page.$eval("#r5", (e) => e.files.length), 0);
    eq("the radio is unchecked again",
       await page.$$eval('[name="spon"]', (n) => n.some((r) => r.checked)), false);
    await page.close();
  }

  /* ---- 9. ambiguity ---- */
  console.log("\n9. ambiguity");
  {
    const page = await open(`
      <form data-name="ambiguous">
        <label for="a1">Reference's company name</label><input id="a1" name="ref_company">
        <label for="a2">School name</label><input id="a2" name="school_name">
        <label for="a3">Confirm email</label><input id="a3" name="confirm_email">
        <label for="a4">Reference's full name</label><input id="a4" name="ref_name">
        <label for="a5">Country code</label><input id="a5" name="country_code">
        <label for="a6">Email</label><input id="a6" name="email">
      </form>`);
    await page.fill_();
    for (const [what, sel] of [["a reference's company", "#a1"], ["a school name", "#a2"],
                               ["a confirm-email box", "#a3"], ["a reference's name", "#a4"],
                               ["a country code", "#a5"]]) {
      eq(what + " is left alone", await page.val(sel), "");
    }
    eq("the real email still fills", await page.val("#a6"), "rj@example.com");
    await page.close();
  }

  /* ---- 10. it reports honestly ---- */
  console.log("\n10. it reports honestly");
  {
    const page = await open(`
      <form data-name="report">
        <label for="z1">Email</label><input id="z1" name="email">
        <label for="z2">Gender</label><input id="z2" name="gender">
      </form>`);
    const r = await page.fill_();
    eq("it says what it filled", r.fields, ["email"]);
    eq("and counts it", r.filled, 1);
    ok("it does not claim the demographic field", !r.fields.includes("gender"), r.fields);
    await page.close();
  }

  await browser.close();
  if (errors.length) { fail += errors.length; console.log("\npage errors:", errors); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
