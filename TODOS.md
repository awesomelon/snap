# TODOs

## Alt 키 거리 확인 모드 (Figma Inspect 스타일)

**What:** 드래그 없이 요소 위에 마우스를 놓고 Alt 키를 누르면 주변 요소까지의 거리가 표시되는 기능

**Why:** 디자이너가 드래그 없이 요소 간 간격을 빠르게 확인할 수 있어 QA 워크플로우 강화

**Pros:**
- Figma 사용자에게 익숙한 패턴
- 드래그 시 거리 라벨 렌더링은 이미 구현 완료 (`computeDistances`, `renderDistanceLabels`)
- hover+Alt 모드만 추가하면 됨

**Cons:**
- Alt 키가 일부 브라우저/OS 단축키와 충돌할 수 있음 (메뉴바 접근 등)

**Context:** 요소 기반 magnetic 스냅 전환 (2026-03-22) 이후 추가 가능. `snap-engine.ts`의 `computeDistances()`와 `snap-guides.ts`의 `renderDistanceLabels()`를 재사용. `drag-core.ts`의 hover 핸들러에 Alt 키 감지 로직 추가 필요.

**Depends on:** 요소 기반 magnetic 스냅 구현 완료 (이번 PR)

**Added:** 2026-03-22 | **Source:** /plan-eng-review
