const ingredientPictures={
  'Red pepper':'/assets/red-pepper.svg?v=1',
  'Fresh basil':'/assets/fresh-basil.svg?v=1'
};

function applyIngredientPictures(){
  document.querySelectorAll('#toppings .choice').forEach(label=>{
    const input=label.querySelector('input');
    const source=ingredientPictures[input?.value];
    if(!source)return;

    const iconSlot=label.querySelector('span');
    if(!iconSlot||iconSlot.querySelector('img'))return;

    iconSlot.classList.add('ingredient-picture');
    iconSlot.innerHTML=`<img src="${source}" alt="" aria-hidden="true">`;
  });
}

const style=document.createElement('style');
style.textContent=`
  .choice .ingredient-picture{
    width:42px;
    height:42px;
    flex:0 0 42px;
    display:grid;
    place-items:center;
    overflow:hidden;
  }
  .choice .ingredient-picture img{
    display:block;
    width:40px;
    height:40px;
    object-fit:contain;
  }
`;
document.head.appendChild(style);

const toppings=document.querySelector('#toppings');
if(toppings){
  new MutationObserver(applyIngredientPictures).observe(toppings,{childList:true,subtree:true});
}
applyIngredientPictures();
